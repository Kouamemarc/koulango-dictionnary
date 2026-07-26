"""Upload et diffusion des fichiers média (illustrations) — stockés en base."""
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.models import MediaFile

router = APIRouter(prefix="/media", tags=["Média"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 Mo


@router.post("", status_code=201, summary="Uploader une image (illustration)")
async def upload(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Accessible sans compte, comme la contribution : accepte jpeg/png/webp/gif, 5 Mo max."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Format d'image non supporté (jpeg, png, webp ou gif uniquement).",
        )
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image trop volumineuse (5 Mo max).")

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
