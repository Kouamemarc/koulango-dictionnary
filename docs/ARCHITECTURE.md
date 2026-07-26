# Architecture — Koulango Dictionary

## Clean Architecture

Quatre couches concentriques ; les dépendances pointent vers le centre.

```
┌─────────────────────────────────────────────┐
│  api/ (routers, deps)  ← présentation        │
│  ┌───────────────────────────────────────┐   │
│  │ application/ (services, cas d'usage)  │   │
│  │  ┌─────────────────────────────────┐  │   │
│  │  │ domain/ (enums, interfaces)     │  │   │  ← cœur, sans framework
│  │  └─────────────────────────────────┘  │   │
│  └───────────────────────────────────────┘   │
│  infrastructure/ (ORM, repositories)         │  ← implémente les ports du domaine
└─────────────────────────────────────────────┘
```

- **domain** : `enums.py` (rôles, statuts), `interfaces.py` (ports `IWordRepository`).
  Aucune dépendance à FastAPI/SQLAlchemy → testable et stable.
- **application** : `AuthService`, `WordService` (recherche intelligente + contribution),
  `AdminService` (validation, fusion). Orchestrent la logique métier.
- **infrastructure** : modèles SQLAlchemy (`models.py`) et repositories concrets.
- **api** : routers FastAPI, dépendances (`get_current_user`, `require_role`).

## Workflow de contribution

```
Utilisateur ──propose──▶ Word(status=EN_ATTENTE_VALIDATION) + Contribution(PENDING)
                                            │
                        Modérateur ──review─┤
                                            ├─ accepte  ▶ Word=PUBLIE  + Notification
                                            ├─ refuse   ▶ Word=REFUSE  + motif obligatoire
                                            └─ fusionne ▶ Word=FUSIONNE (via /words/merge)
```

Chaque décision crée une ligne `validations` (traçabilité : modérateur, décision, motif).

## Schéma relationnel (résumé)

| Table | Rôle | Clés étrangères notables |
|-------|------|--------------------------|
| users | comptes + rôle | — |
| dialects | dialectes koulango | — |
| words | entité centrale | dialect_id, created_by, merged_into_id |
| expressions | expressions liées | word_id |
| definitions | définitions | word_id |
| examples | exemples d'usage | word_id |
| pronunciations | IPA / phonétique | word_id |
| audios | fichiers audio | word_id |
| synonyms | paires de synonymes | word_id, synonym_id |
| spelling_variants | variantes orthographiques | word_id |
| contributions | propositions | author_id, word_id |
| validations | décisions de modération | contribution_id, moderator_id |
| favorites | favoris utilisateur | user_id, word_id |
| search_history | historique de recherche | user_id, word_id |
| reports | signalements | reporter_id, word_id |
| notifications | notifications in-app | user_id |

## Recherche floue — détail SQL

```sql
SELECT id, term,
       similarity(normalized, :q) AS sim,     -- pg_trgm
       levenshtein(normalized, :q) AS dist    -- fuzzystrmatch
FROM words
WHERE status <> 'REFUSE'
  AND (similarity(normalized, :q) >= :threshold
       OR levenshtein(normalized, :q) <= :max_distance)
ORDER BY sim DESC, dist ASC
LIMIT :limit;
```

Index : `CREATE INDEX ... ON words USING gin (normalized gin_trgm_ops);`
