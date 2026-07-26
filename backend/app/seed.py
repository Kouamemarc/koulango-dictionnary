"""Peuple la base avec un admin, des dialectes et quelques mots publiés.

Usage : python -m app.seed
"""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.domain.enums import UserRole, WordStatus
from app.infrastructure.models import Definition, Dialect, User, Word
from app.infrastructure.repositories.word_repository import normalize


def run() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter_by(email="admin@koulango.dev").first():
            db.add(User(
                email="admin@koulango.dev", username="admin",
                full_name="Administrateur", role=UserRole.ADMIN,
                hashed_password=hash_password("Admin1234!"),
            ))
        if not db.query(Dialect).first():
            db.add_all([
                Dialect(name="Nabè", region="Bondoukou"),
                Dialect(name="Sègè", region="Nassian"),
            ])
        db.flush()
        dialect = db.query(Dialect).first()
        samples = [
            ("kôrô", "bonjour", "hello", "Salutation du matin."),
            ("kôlôngô", "eau", "water", "Liquide vital."),
            ("bɛrɛ", "maison", "house", "Habitation."),
        ]
        for term, fr, en, definition in samples:
            if not db.query(Word).filter_by(normalized=normalize(term)).first():
                w = Word(
                    term=term, normalized=normalize(term), fr_translation=fr,
                    en_translation=en, status=WordStatus.PUBLISHED, dialect_id=dialect.id,
                )
                w.definitions.append(Definition(text=definition))
                db.add(w)
        db.commit()
        print("Seed terminé : admin@koulango.dev / Admin1234!")
    finally:
        db.close()


if __name__ == "__main__":
    run()
