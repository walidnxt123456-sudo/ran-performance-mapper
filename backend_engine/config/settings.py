import os
from typing import Literal, Dict, Any
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Informations générales
    APP_NAME: str = "RAN Performance Mapper"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Profils disponibles : "level1", "level2" ou "commercial"
    CLIENT_PROFILE: Literal["level1", "level2", "commercial"] = "commercial"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def feature_flags(self) -> Dict[str, Any]:
        """
        Dictionnaire des fonctionnalités activées selon le profil utilisateur.
        """
        # 1. Profil Commercial (Vue Synthétique / Non-Technique)
        if self.CLIENT_PROFILE == "commercial":
            return {
                "profile_name": "commercial",
                "show_raw_counters": False,
                "enable_advanced_rca": False,
                "enable_kpi_formula_editor": False,
                "show_technical_layers": False,
                "allowed_kpi_types": ["quality_score", "traffic_global", "coverage_index"],
                "export_formats": ["pdf_summary", "excel_summary"],
                "dashboard_type": "executive_summary"
            }

        # 2. Profil Technique Level 1 (Opérationnel / KPIs Standard)
        if self.CLIENT_PROFILE == "level1":
            return {
                "profile_name": "level1",
                "show_raw_counters": False,          # Masque les compteurs de très bas niveau
                "enable_advanced_rca": False,        # Désactive la RCA complexe
                "enable_kpi_formula_editor": False,  # Formules prédéfinies uniquement
                "show_technical_layers": True,       # Affiche la carte et les cellules
                "allowed_kpi_types": ["accessibility", "retainability", "mobility", "throughput"],
                "export_formats": ["csv", "excel_standard"],
                "dashboard_type": "standard_analytics"
            }

        # 3. Profil Technique Level 2 (Expert / Ingénieur RAN - Par défaut)
        return {
            "profile_name": "level2",
            "show_raw_counters": True,           # Accès total aux compteurs PM
            "enable_advanced_rca": True,         # Moteur RCA complet
            "enable_kpi_formula_editor": True,   # Éditeur de formules sur mesure
            "show_technical_layers": True,       # Tous les calques (azimuts, fréquences, etc.)
            "allowed_kpi_types": ["all"],
            "export_formats": ["csv", "json", "excel_raw"],
            "dashboard_type": "advanced_analytics"
        }

# Instance globale réutilisable
settings = Settings()