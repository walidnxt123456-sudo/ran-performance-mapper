from pathlib import Path
from fastapi import APIRouter
from backend_engine.config.settings import settings

router = APIRouter(prefix="/api/v1/config", tags=["App Configuration"])

@router.get("", summary="Récupère la configuration globale et les Feature Flags")
def get_app_configuration():
    """
    Expose le profil actif (level1, level2, commercial) et le dictionnaire
    des fonctionnalités autorisées (Feature Flags) pour le Frontend.
    """
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "profile": settings.CLIENT_PROFILE,
        "features": settings.feature_flags
    }

@router.get("/cell-hierarchy", summary="Arborescence des cellules et sites")
def get_cell_hierarchy():
    data_path = Path("./data/cell_file/")
    techs = ["2g", "3g", "4g", "5g"]
    hierarchy = {}

    for tech in techs:
        file_match = next(data_path.glob(f"*{tech}*.csv"), None)
        sites_list, site_names, cells_list = [], [], []

        if file_match and file_match.exists():
            import pandas as pd
            try:
                # Lecture rapide des premières lignes pour extraire les identifiants
                df = pd.read_csv(file_match, nrows=100)
                df.columns = df.columns.str.lower()
                
                site_col = next((c for c in df.columns if "site" in c), df.columns[0])
                cell_col = next((c for c in df.columns if "cell" in c), df.columns[1])
                
                sites_list = df[site_col].dropna().unique().astype(str).tolist()[:10]
                site_names = sites_list
                cells_list = df[cell_col].dropna().unique().astype(str).tolist()[:10]
            except Exception as e:
                print(f"Erreur lecture {file_match}: {e}")

        # Valeurs par défaut si le fichier CSV est absent pour la techno
        hierarchy[tech.upper()] = {
            "sites": sites_list if sites_list else [f"Site1_{tech}", f"Site2_{tech}"],
            "site_names": site_names if site_names else [f"SITE_001_{tech}", f"SITE_002_{tech}"],
            "cells": cells_list if cells_list else ["001", "002"]
        }
        
    return hierarchy