"""Contrats (ports) de la couche domaine.

En Clean Architecture, la couche métier définit des interfaces abstraites ;
l'infrastructure fournit les implémentations concrètes. Cela permet de tester
les cas d'usage sans base de données réelle et de remplacer le stockage.
"""
from abc import ABC, abstractmethod
from typing import Protocol, Sequence


class WordSuggestion(Protocol):
    """Résultat d'une suggestion de recherche floue."""
    word: str
    similarity: float
    distance: int


class IWordRepository(ABC):
    """Port d'accès aux mots."""

    @abstractmethod
    def get(self, word_id: int): ...

    @abstractmethod
    def get_by_term(self, term: str): ...

    @abstractmethod
    def search(self, query: str, limit: int) -> Sequence: ...

    @abstractmethod
    def fuzzy_suggestions(self, term: str, threshold: float, max_distance: int, limit: int) -> Sequence: ...

    @abstractmethod
    def create(self, **data): ...

    @abstractmethod
    def list_by_status(self, status, limit: int, offset: int) -> Sequence: ...
