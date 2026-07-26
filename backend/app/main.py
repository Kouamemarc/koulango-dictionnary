"""Point d'entrée de l'API Koulango Dictionary (FastAPI + Swagger)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import admin, auth, contributions, favorites, words
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST du dictionnaire collaboratif officiel de la langue **Koulango**.\n\n"
        "- Authentification JWT + rôles (Utilisateur, Modérateur, Administrateur)\n"
        "- Recherche floue (pg_trgm + Levenshtein) avant l'ajout d'un mot\n"
        "- Workflow de contribution avec validation par un administrateur\n"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enregistrement des routers sous le préfixe /api/v1
for r in (auth.router, words.router, contributions.router, favorites.router, admin.router):
    app.include_router(r, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Système"])
def health():
    """Sonde de disponibilité (readiness/liveness)."""
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
