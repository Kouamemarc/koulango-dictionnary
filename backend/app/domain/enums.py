"""Énumérations métier (indépendantes de tout framework)."""
from enum import Enum


class UserRole(str, Enum):
    """Rôles applicatifs, du moins au plus privilégié."""
    USER = "utilisateur"
    MODERATOR = "moderateur"
    ADMIN = "administrateur"


class WordStatus(str, Enum):
    """Cycle de vie d'un mot dans le dictionnaire."""
    PENDING = "EN_ATTENTE_VALIDATION"
    PUBLISHED = "PUBLIE"
    REJECTED = "REFUSE"
    MERGED = "FUSIONNE"


class ContributionType(str, Enum):
    CREATE = "creation"
    EDIT = "modification"


class ValidationDecision(str, Enum):
    ACCEPTED = "accepte"
    REJECTED = "refuse"
    MERGED = "fusionne"


class ReportStatus(str, Enum):
    OPEN = "ouvert"
    RESOLVED = "resolu"
    DISMISSED = "rejete"
