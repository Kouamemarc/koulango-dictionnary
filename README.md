# 📖 Koulango Dictionary

Dictionnaire collaboratif officiel de la langue **Koulango**.
Les utilisateurs recherchent des mots, consultent leurs fiches et proposent de
nouveaux termes. Toute contribution est **validée par un administrateur** avant
publication.

> Monorepo : **backend** FastAPI (Clean Architecture) + **frontend** mobile
> React Native / Expo.

---

## 🧱 Stack technique

| Couche | Technologies |
|--------|--------------|
| Mobile | React Native · Expo · TypeScript · React Navigation · React Query · Zustand |
| API | FastAPI · SQLAlchemy 2 · Pydantic v2 · JWT · Swagger/OpenAPI |
| Migrations | Alembic |
| Base de données | PostgreSQL 16 (+ `pg_trgm`, `fuzzystrmatch`, `unaccent`) |
| Recherche | Full-text + trigram + Levenshtein |
| Conteneurisation | Docker · Docker Compose |
| Stockage média | Local · Supabase Storage · Cloudflare R2 (configurable) |

---

## 🚀 Démarrage rapide (Docker)

```bash
git clone <repo> koulango-dictionary
cd koulango-dictionary
docker compose up --build
```

- API : http://localhost:8000
- **Swagger** : http://localhost:8000/docs
- ReDoc : http://localhost:8000/redoc
- Compte admin de démo : `admin@koulango.dev` / `Admin1234!`

Les migrations Alembic et le *seed* de données s'exécutent automatiquement au
démarrage du conteneur `api`.

### Frontend mobile

```bash
cd frontend
npm install
npm start          # puis « i » (iOS), « a » (Android) ou QR code Expo Go
```

> Sur émulateur Android, remplacer `localhost` par `10.0.2.2` dans
> `app.json → extra.apiUrl`. Sur appareil physique, utiliser l'IP LAN de la machine.

---

## 🗂️ Architecture (Clean Architecture)

```
backend/app/
├── core/            # config, database, security (JWT, hachage)
├── domain/          # entités, énumérations, interfaces (ports) — sans dépendance framework
├── application/     # cas d'usage / services métier
├── infrastructure/  # modèles SQLAlchemy + repositories (adaptateurs)
├── api/             # routers FastAPI + dépendances (gardes de rôles)
└── schemas/         # DTO Pydantic (entrée/sortie)
```

Le flux de dépendances va toujours **de l'extérieur vers le domaine** :
`api → application → domain ← infrastructure`. Le domaine ne connaît ni FastAPI
ni SQLAlchemy, ce qui rend les cas d'usage testables et le stockage remplaçable.

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🔍 Recherche intelligente (avant l'ajout d'un mot)

Avant d'enregistrer un mot, l'API vérifie s'il existe déjà **ou** s'il existe une
variante proche, en combinant en une seule requête SQL :

1. **Égalité normalisée** (minuscule + suppression d'accents) ;
2. **Similarité trigram** via `pg_trgm` (`similarity`, opérateur `%`) ;
3. **Distance d'édition** via `levenshtein` (`fuzzystrmatch`).

`GET /api/v1/contributions/check?term=kolongo` renvoie :

```json
{
  "exists": false,
  "message": "Le mot n'existe pas. Avez-vous voulu dire : kôlôngô ? Est-ce le même mot ?",
  "suggestions": [{ "word_id": 2, "term": "kôlôngô", "similarity": 0.72, "distance": 2 }]
}
```

Côté mobile, si l'utilisateur répond **Oui** (même mot), la création est
abandonnée ; sinon elle continue avec `force_create=true`.

Un index `GIN … gin_trgm_ops` sur `words.normalized` rend la similarité performante.

---

## 👤 Rôles & sécurité

| Rôle | Droits |
|------|--------|
| **Utilisateur** | recherche, favoris, historique, proposer un mot |
| **Modérateur** | + valider / refuser (motif obligatoire) les contributions |
| **Administrateur** | + fusionner deux mots, supprimer, gérer |

- Authentification **JWT** (access + refresh), hachage **bcrypt**.
- Gardes de rôles hiérarchiques via la dépendance `require_role(...)`.

---

## 🗃️ Schéma relationnel

`users`, `dialects`, `words`, `expressions`, `definitions`, `examples`,
`pronunciations`, `audios`, `synonyms`, `spelling_variants`, `contributions`,
`validations`, `favorites`, `search_history`, `reports`, `notifications`.

Diagramme et détails : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## ✅ Tests

```bash
cd backend
pip install -r requirements.txt
pytest -q          # auth, santé, consultation (SQLite en mémoire)
```

> La recherche floue nécessite PostgreSQL ; ces cas sont couverts en intégration
> (à lancer sur la base Docker).

---

## 📁 Structure du dépôt

```
koulango-dictionary/
├── backend/          # API FastAPI
├── frontend/         # App mobile Expo
├── docs/             # documentation
├── docker-compose.yml
└── README.md
```

---

## 📄 Licence

Projet à visée culturelle et éducative pour la préservation de la langue Koulango.
