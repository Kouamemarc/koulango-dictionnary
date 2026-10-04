"""Assistant conversationnel (API Claude) qui guide l'ajout d'un mot.

Claude pose les questions une à une, vérifie lui-même les doublons via la
recherche floue existante, traduit la traduction française en anglais, puis
produit un brouillon de proposition. Le brouillon n'est PAS enregistré ici :
le client l'affiche pour confirmation puis l'envoie à POST /contributions,
ce qui conserve l'anti-doublon et la limitation de débit habituels.
"""
import json
import logging
import threading
import time
from collections import defaultdict, deque

import anthropic
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.application.services.word_service import WordService
from app.core.config import settings
from app.schemas.assistant import ChatRequest, ChatResponse
from app.schemas.word import WordCreate

logger = logging.getLogger(__name__)

# Nombre maximal d'allers-retours outil <-> modèle pour un seul message utilisateur.
MAX_TOOL_STEPS = 6

PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"]

SYSTEM_PROMPT = """Tu es l'assistant du Dictionnaire Koulango, un dictionnaire collaboratif de la langue koulango (Côte d'Ivoire). Tu aides des contributeurs, souvent peu à l'aise avec les formulaires, à proposer un nouveau mot ou une nouvelle expression en discutant avec eux. L'interface les a déjà accueillis par : « Bonjour ! Quel mot ou quelle expression koulango voulez-vous ajouter ? »

Informations à recueillir :
- le mot ou l'expression en koulango (obligatoire) ;
- sa traduction en français (indispensable) ;
- sa nature : nom, verbe, adjectif, pronom, adverbe ou interjection (aucune pour une expression) ;
- recommandé : la prononciation, écrite comme elle se dit (par exemple avec les tons ou en découpant les syllabes) ; demande-la systématiquement, en expliquant qu'elle aide beaucoup ceux qui ne connaissent pas le mot, mais que l'utilisateur peut passer ;
- facultatif : une définition ou une précision de sens, une phrase d'exemple en koulango avec sa traduction française, d'autres sens possibles, et le nom du contributeur.

Un enregistrement audio de la prononciation et une image d'illustration sont aussi recommandés, mais tu ne peux pas les recevoir dans la discussion : l'utilisateur les ajoute avec les boutons « Enregistrer » et « Choisir une image » du récapitulatif.

Façon de mener la conversation :
- Écris en français simple et chaleureux, en phrases courtes, sans markdown (pas d'astérisques, de titres ni de listes à puces) : tes messages s'affichent en texte brut dans une bulle de discussion.
- Pose une ou deux questions à la fois. Pour les informations facultatives, précise que l'utilisateur peut passer. Ne redemande pas une information déjà donnée.
- Si la nature du mot se déduit clairement de la traduction, propose-la plutôt que de la demander.
- L'historique de la conversation ne contient que le texte des messages, pas tes appels d'outils des tours précédents. Ce que tu as annoncé dans tes messages précédents a bien été fait : ne remets jamais en cause une vérification passée et ne t'en excuse pas. Si tu veux revérifier un mot avant prepare_word, fais-le sans le mentionner, sauf si le résultat a changé.
- Dès que tu connais le mot koulango, appelle check_word. S'il existe déjà, dis-le et n'en prépare pas de proposition. S'il existe des mots proches, cite-les et demande si c'est le même mot ; si l'utilisateur confirme que c'est un mot différent, mets confirmed_new_word à true dans prepare_word.

Ce que tu peux et ne peux pas faire avec les langues :
- Tu traduis toi-même la traduction française en anglais pour remplir en_translation ; ne la demande pas à l'utilisateur. Tu peux aussi corriger l'orthographe des textes en français.
- Tu ne connais pas le koulango de façon fiable. N'invente, ne corrige et ne traduis jamais rien vers le koulango : le mot, l'exemple et la prononciation koulango viennent uniquement de l'utilisateur, recopiés tels quels. Si on te demande une traduction vers le koulango, explique que c'est justement la communauté qui enrichit le dictionnaire.

Quand tu as au moins le mot koulango et sa traduction française, et que l'utilisateur n'a plus rien à ajouter sur les points facultatifs, appelle prepare_word. L'interface affiche alors un récapitulatif avec un bouton « Envoyer la proposition ». Dans ton message, demande à l'utilisateur d'y ajouter si possible un enregistrement de la prononciation et une image d'illustration (recommandés, pas obligatoires), puis de vérifier et d'envoyer, ou de te dire quoi corriger. Si l'utilisateur demande une correction, rappelle prepare_word avec la proposition complète corrigée. Une proposition envoyée est relue par un modérateur avant publication.

Reste centré sur l'ajout de mots au dictionnaire ; pour une autre demande, réponds poliment que ce n'est pas ton rôle ici."""

TOOLS = [
    {
        "name": "check_word",
        "description": (
            "Vérifie dans le dictionnaire si un mot koulango existe déjà ou s'il existe des "
            "variantes orthographiques proches. Renvoie exists, un message et la liste des suggestions."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"term": {"type": "string", "description": "Le mot ou l'expression en koulango."}},
            "required": ["term"],
            "additionalProperties": False,
        },
    },
    {
        "name": "prepare_word",
        "description": (
            "Prépare la proposition finale et l'affiche à l'utilisateur sous forme de récapitulatif "
            "à confirmer. N'enregistre rien : c'est l'utilisateur qui l'envoie. Renseigne seulement "
            "les champs connus ; les textes koulango sont recopiés exactement comme l'utilisateur les a écrits."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "term": {"type": "string", "description": "Mot ou expression en koulango."},
                "fr_translation": {"type": "string", "description": "Traduction principale en français."},
                "en_translation": {"type": "string", "description": "Traduction en anglais, faite par toi depuis le français."},
                "part_of_speech": {"type": "string", "enum": PARTS_OF_SPEECH},
                "definition": {"type": "string", "description": "Définition ou précision de sens, en français."},
                "example": {"type": "string", "description": "Phrase d'exemple en koulango."},
                "example_translation": {"type": "string", "description": "Traduction française de l'exemple."},
                "pronunciation": {"type": "string", "description": "Prononciation écrite telle que donnée par l'utilisateur."},
                "source": {"type": "string", "description": "Nom du contributeur, s'il l'a donné."},
                "other_translations": {
                    "type": "array",
                    "description": "Autres sens du mot, en plus de la traduction principale.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "language": {"type": "string", "enum": ["fr", "en"]},
                            "text": {"type": "string"},
                        },
                        "required": ["language", "text"],
                        "additionalProperties": False,
                    },
                },
                "confirmed_new_word": {
                    "type": "boolean",
                    "description": "true si l'utilisateur a confirmé que c'est un mot différent des variantes proches trouvées.",
                },
            },
            "required": ["term", "fr_translation"],
            "additionalProperties": False,
        },
    },
]


class RateLimiter:
    """Fenêtre glissante d'une heure par IP, en mémoire (une seule instance sur Render)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(
        self,
        key: str | None,
        limit: int,
        message: str = "Beaucoup de messages envoyés à l'assistant cette dernière heure. Réessayez un peu plus tard.",
    ) -> None:
        if not key:
            return
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > 3600:
                hits.popleft()
            if len(hits) >= limit:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, message)
            hits.append(now)


rate_limiter = RateLimiter()

_client: anthropic.Anthropic | None = None


def get_anthropic_client() -> anthropic.Anthropic:
    global _client
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "L'assistant n'est pas configuré sur ce serveur.")
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=40.0)
    return _client


def _draft_from_tool_input(data: dict) -> WordCreate:
    return WordCreate(
        term=data["term"].strip(),
        fr_translation=data.get("fr_translation"),
        en_translation=data.get("en_translation"),
        part_of_speech=data.get("part_of_speech"),
        definition=data.get("definition"),
        example=data.get("example"),
        example_translation=data.get("example_translation"),
        pronunciation=data.get("pronunciation"),
        source=data.get("source"),
        translations=[
            {"language": t["language"], "text": t["text"]} for t in data.get("other_translations", []) if t.get("text")
        ],
        force_create=bool(data.get("confirmed_new_word", False)),
    )


class AssistantService:
    def __init__(self, client: anthropic.Anthropic, words: WordService):
        self.client = client
        self.words = words

    def _run_tool(self, name: str, data: dict) -> tuple[str, bool, WordCreate | None]:
        """Exécute un outil ; renvoie (contenu du tool_result, is_error, brouillon éventuel)."""
        if name == "check_word":
            try:
                res = self.words.smart_check(data["term"])
            except Exception:
                logger.exception("check_word a échoué")
                return "Vérification indisponible pour le moment ; continue sans.", True, None
            return res.model_dump_json(), False, None
        if name == "prepare_word":
            try:
                draft = _draft_from_tool_input(data)
            except (ValidationError, KeyError, AttributeError) as e:
                return f"Proposition invalide : {e}", True, None
            return "Récapitulatif affiché à l'utilisateur, en attente de sa confirmation.", False, draft
        return f"Outil inconnu : {name}", True, None

    def chat(self, req: ChatRequest) -> ChatResponse:
        if req.messages[0].role != "user":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "La conversation doit commencer par un message utilisateur.")

        messages: list = [m.model_dump() for m in req.messages]
        draft: WordCreate | None = None

        for _ in range(MAX_TOOL_STEPS):
            try:
                response = self.client.beta.messages.create(
                    model=settings.ASSISTANT_MODEL,
                    max_tokens=4096,
                    system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
                    tools=TOOLS,
                    messages=messages,
                    # Conversation simple : effort bas = réponses rapides et peu coûteuses.
                    output_config={"effort": "low"},
                    # Si le modèle décline par erreur, l'API rejoue la requête sur un modèle de repli.
                    betas=["server-side-fallback-2026-07-01"],
                    fallbacks="default",
                )
            except anthropic.RateLimitError:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "L'assistant est très sollicité. Réessayez dans un instant.")
            except (anthropic.APIStatusError, anthropic.APIConnectionError):
                logger.exception("Appel à l'API Claude impossible")
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "L'assistant est momentanément indisponible.")

            if response.stop_reason == "refusal":
                return ChatResponse(
                    reply="Désolé, je ne peux pas répondre à ce message. Parlons du mot que vous voulez ajouter !",
                    draft=draft,
                )

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if response.stop_reason != "tool_use" or not tool_uses:
                break

            messages.append({"role": "assistant", "content": response.content})
            results = []
            for block in tool_uses:
                content, is_error, new_draft = self._run_tool(block.name, block.input)
                if new_draft is not None:
                    draft = new_draft
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error})
            messages.append({"role": "user", "content": results})

        reply = "\n\n".join(b.text for b in response.content if b.type == "text").strip()
        if not reply:
            reply = (
                "Voici le récapitulatif de votre proposition. Vérifiez-le puis envoyez-le, ou dites-moi quoi corriger."
                if draft
                else "Pouvez-vous reformuler ? Je n'ai pas bien compris."
            )
        return ChatResponse(reply=reply, draft=draft)
