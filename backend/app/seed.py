"""Crée le compte administrateur s'il n'existe pas déjà.

Usage : python -m app.seed
"""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.domain.enums import UserRole
from app.infrastructure.models import User


def run() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter_by(email="admin@koulango.dev").first():
            db.add(User(
                email="admin@koulango.dev", username="admin",
                full_name="Administrateur", role=UserRole.ADMIN,
                hashed_password=hash_password("Admin1234!"),
            ))
            db.commit()
            print("Seed terminé : admin@koulango.dev / Admin1234!")
        else:
            print("Seed : compte admin déjà présent, rien à faire.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
