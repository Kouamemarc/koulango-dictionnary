# API REST — Koulango Dictionary

Base : `http://localhost:8000/api/v1` · Documentation interactive : `/docs` (Swagger).

## Authentification
| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| POST | `/auth/register` | public | Inscription |
| POST | `/auth/login` | public | Connexion → access + refresh |
| POST | `/auth/refresh` | public | Renouveler l'access token |
| GET | `/auth/me` | connecté | Profil courant |

## Mots
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/words/search?q=` | Recherche instantanée |
| GET | `/words/{id}` | Fiche détaillée |

## Contributions
| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/contributions/check?term=` | connecté | Vérification intelligente |
| POST | `/contributions` | connecté | Proposer un mot (EN_ATTENTE_VALIDATION) |

## Favoris & historique
| Méthode | Endpoint |
|---------|----------|
| GET/POST/DELETE | `/me/favorites[/{id}]` |
| GET | `/me/history` |

## Administration (Modérateur+)
| Méthode | Endpoint | Rôle |
|---------|----------|------|
| GET | `/admin/pending` | Modérateur |
| POST | `/admin/contributions/{id}/review` | Modérateur |
| POST | `/admin/words/merge` | Administrateur |
| DELETE | `/admin/words/{id}` | Administrateur |

Le schéma OpenAPI complet est généré automatiquement par FastAPI (`/api/v1/openapi.json`).
