"""Upload et diffusion des fichiers média (illustrations) — stockés en base."""
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.models import MediaFile

router = APIRouter(prefix="/media", tags=["Média"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac",
    "audio/wav", "audio/x-wav", "audio/webm", "audio/3gpp", "audio/ogg",
}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_AUDIO_TYPES
MAX_SIZE = 8 * 1024 * 1024  # 8 Mo

# Variantes de noms rencontrées selon les navigateurs / téléphones.
TYPE_ALIASES = {
    "audio/mp3": "audio/mpeg", "audio/x-mp3": "audio/mpeg", "audio/x-mpeg": "audio/mpeg",
    "audio/wave": "audio/wav", "audio/vnd.wave": "audio/wav", "audio/x-aac": "audio/aac",
    "audio/opus": "audio/ogg", "audio/x-ogg": "audio/ogg", "image/jpg": "image/jpeg",
    # Enregistrement micro « audio seul » parfois étiqueté comme vidéo (Chrome Android, Safari).
    "video/webm": "audio/webm", "video/mp4": "audio/mp4", "video/3gpp": "audio/3gpp",
}
# Quand le téléphone ne donne pas de type (application/octet-stream), on se fie à l'extension.
EXTENSION_TYPES = {
    "mp3": "audio/mpeg", "m4a": "audio/mp4", "aac": "audio/aac", "wav": "audio/wav", "webm": "audio/webm",
    "ogg": "audio/ogg", "opus": "audio/ogg", "3gp": "audio/3gpp",
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif",
}


def normalize_content_type(content_type: str | None, filename: str | None) -> str:
    """« audio/webm;codecs=opus » (MediaRecorder) → « audio/webm », alias → type canonique,
    type absent ou générique → déduit de l'extension du fichier."""
    base = (content_type or "").split(";")[0].strip().lower()
    base = TYPE_ALIASES.get(base, base)
    if base in ALLOWED_TYPES:
        return base
    ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    return EXTENSION_TYPES.get(ext, base)


@router.post("", status_code=201, summary="Uploader une image ou un audio")
async def upload(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Accessible sans compte, comme la contribution : image (jpeg/png/webp/gif) ou
    audio (mp3/m4a/aac/wav/ogg/webm), 8 Mo max."""
    content_type = normalize_content_type(file.content_type, file.filename)
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Format non supporté (image jpeg/png/webp/gif ou audio mp3/m4a/aac/wav/ogg).",
        )
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Fichier trop volumineux (8 Mo max).")

    media = MediaFile(content_type=content_type, data=data)
    db.add(media)
    db.commit()
    db.refresh(media)
    return {"url": str(request.url_for("get_media", media_id=media.id))}


@router.get("/{media_id}", name="get_media", summary="Récupérer un fichier média")
def get_media(media_id: int, db: Session = Depends(get_db)):
    media = db.get(MediaFile, media_id)
    if not media:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fichier introuvable.")
    return Response(content=media.data, media_type=media.content_type)
