"""Extraction de mots koulango depuis une publication (texte copié ou captures d'écran).

Outil de modération : Claude repère les mots/expressions et leurs traductions,
chaque entrée est comparée au dictionnaire, puis le modérateur relit et publie
lui-même les entrées retenues (via POST /admin/words). Rien n'est enregistré ici.
"""
import json
import logging

import anthropic
from fastapi import HTTPException, status

from app.application.services.word_service import WordService
from app.core.config import settings
from app.schemas.imports import ImportEntry, ImportRequest, ImportResponse

logger = logging.getLogger(__name__)

PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"]

SYSTEM_PROMPT = """Tu aides les modérateurs du Dictionnaire Koulango (langue de Côte d'Ivoire) à récupérer les mots et expressions koulango partagés dans des publications, souvent issues de groupes Facebook. La publication est fournie en texte copié, en captures d'écran, ou les deux.

Extrais chaque mot ou expression koulango accompagné de sa traduction française, avec ces règles :
- Recopie le koulango exactement, caractère par caractère, avec les accents, les tons et les lettres spéciales (ɔ, ɛ, ŋ…). Ne corrige jamais l'orthographe koulango et n'invente jamais de koulango. Si un mot est illisible sur une image, ignore-le plutôt que de deviner et signale-le dans notes.
- fr_translation, definition, example, example_translation et pronunciation viennent uniquement de la publication ; s'ils n'y figurent pas, mets null. Tu peux corriger l'orthographe du français.
- en_translation : traduis toi-même la traduction française en anglais.
- part_of_speech : renseigne-le seulement s'il est évident d'après la traduction française, sinon null ; null pour une expression.
- Si la publication donne une phrase d'exemple en koulango avec sa traduction pour un mot, mets-la dans example et example_translation de ce mot.
- Les listes dans le sens français → koulango s'extraient de la même façon (term est toujours le koulango).
- Ignore ce qui n'est pas une entrée de dictionnaire : salutations de l'auteur, commentaires, hashtags, appels à réagir, publicité.
- Une seule entrée par mot ou expression distincts.
- notes : une ou deux phrases en français pour le modérateur sur ce qui est incertain ou a été ignoré, sinon null."""

_nullable = lambda t: {"type": [t, "null"]}  # noqa: E731

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "term": {"type": "string"},
                    "fr_translation": _nullable("string"),
                    "en_translation": _nullable("string"),
                    "part_of_speech": {"anyOf": [{"type": "string", "enum": PARTS_OF_SPEECH}, {"type": "null"}]},
                    "definition": _nullable("string"),
                    "example": _nullable("string"),
                    "example_translation": _nullable("string"),
                    "pronunciation": _nullable("string"),
                },
                "required": [
                    "term", "fr_translation", "en_translation", "part_of_speech", "definition",
                    "example", "example_translation", "pronunciation",
                ],
                "additionalProperties": False,
            },
        },
        "notes": _nullable("string"),
    },
    "required": ["entries", "notes"],
    "additionalProperties": False,
}


class ImportService:
    def __init__(self, client: anthropic.Anthropic, words: WordService):
        self.client = client
        self.words = words

    def _compare(self, entry: ImportEntry) -> ImportEntry:
        """Indique si l'entrée existe déjà ou ressemble à un mot du dictionnaire."""
        try:
            res = self.words.smart_check(entry.term)
        except Exception:
            logger.exception("Comparaison au dictionnaire impossible pour %r", entry.term)
            entry.existing = "unknown"
            return entry
        entry.matches = [s.term for s in res.suggestions]
        entry.existing = "exists" if res.exists else ("similar" if res.suggestions else "new")
        return entry

    def extract(self, req: ImportRequest) -> ImportResponse:
        if not req.text.strip() and not req.images:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Collez le texte de la publication ou ajoutez une capture d'écran.")

        content: list = [
            {"type": "image", "source": {"type": "base64", "media_type": img.media_type, "data": img.data}}
            for img in req.images
        ]
        text = req.text.strip()
        content.append({
            "type": "text",
            "text": f"Texte de la publication :\n{text}" if text else "La publication est dans les captures d'écran ci-dessus.",
        })

        try:
            response = self.client.with_options(timeout=150.0).beta.messages.create(
                model=settings.ASSISTANT_MODEL,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": content}],
                output_config={"effort": "medium", "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA}},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.BadRequestError as e:
            logger.warning("Requête d'import refusée par l'API Claude : %s", e.message)
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Contenu illisible (image trop grande ou format non pris en charge ?).")
        except (anthropic.APIStatusError, anthropic.APIConnectionError):
            logger.exception("Appel à l'API Claude impossible")
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "L'IA est momentanément indisponible. Réessayez.")

        if response.stop_reason == "refusal":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "L'IA n'a pas pu traiter cette publication.")
        if response.stop_reason == "max_tokens":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Publication trop longue : découpez-la en plusieurs parties.")

        raw = next((b.text for b in response.content if b.type == "text"), "")
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logger.error("Réponse d'import non JSON : %r", raw[:500])
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Réponse de l'IA inexploitable. Réessayez.")

        entries = [self._compare(ImportEntry(**e)) for e in data.get("entries", []) if e.get("term", "").strip()]
        return ImportResponse(entries=entries, notes=data.get("notes"))
