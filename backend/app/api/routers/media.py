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


@router.post("", status_code=201, summary="Uploader une image ou un audio")
async def upload(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Accessible sans compte, comme la contribution : image (jpeg/png/webp/gif) ou
    audio (mp3/m4a/aac/wav/ogg/webm), 8 Mo max."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Format non supporté (image jpeg/png/webp/gif ou audio mp3/m4a/aac/wav/ogg).",
        )
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Fichier trop volumineux (8 Mo max).")

    media = MediaFile(content_type=file.content_type, data=data)
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
