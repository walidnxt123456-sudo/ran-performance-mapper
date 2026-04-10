"""
GEO LOCATOR NEAREST - RF Site Discovery Engine
==============================================
A reusable module for finding the N nearest physical sites 
from cell-level CSV data based on geographic coordinates.

Project Structure:
- backend_engine/infrastructure/csv_reader.py
- backend_engine/services/radio_utils.py
- backend_engine/services/geo_locator_nearest.py
- data/cell_file/*.csv

Dependencies: 
- pandas, numpy
"""

import os
import pandas as pd
import numpy as np
import json
from pathlib import Path

# Flexible Imports: Works whether run as a module or a standalone script
try:
    from backend_engine.infrastructure.csv_reader import CsvReader
    from backend_engine.services.radio_utils import find_standard_col
except ImportError:
    # Fallback for local testing if running the script directly
    import sys
    sys.path.append(str(Path(__file__).parent.parent.parent))
    from backend_engine.infrastructure.csv_reader import CsvReader
    from backend_engine.services.radio_utils import find_standard_col

class GeoLocatorNearest:
    """
    Service to find and group the nearest sites from CSV design data.
    Processes a SINGLE cell file specified in the request.
    Input JSON: {
    'center': {'lat': float, 'lon': float},
    'file_path': str,
    'limit': int
    }
    Output: JSON-like dict with site and sector information including technology.
    """
    
    def __init__(self, custom_path=None):
        self.reader = CsvReader()

    def _calculate_haversine(self, lat1, lon1, lat2, lon2):
        """Vectorized Haversine formula for fast distance calculations (KM)."""
        R = 6371.0 
        p1, p2 = np.radians(lat1), np.radians(lat2)
        dp, dl = np.radians(lat2-lat1), np.radians(lon2-lon1)
        a = np.sin(dp/2)**2 + np.cos(p1)*np.cos(p2)*np.sin(dl/2)**2
        return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

    def _detect_tech(self, filename):
        """Identifies technology (4G/5G) based on filename patterns."""
        fn = filename.lower()
        if any(x in fn for x in ["4g", "lte"]): return "4G"
        if any(x in fn for x in ["5g", "nr"]): return "5G"
        return "Unknown"

    def find_nearest_sites(self, request_json: dict) -> dict:
        """
        The main execution point.
        Args:
            request_json (dict): {'center': {'lat': float, 'lon': float}, 
                                 'technologies': list, 'limit': int}
        Returns:
            dict: Standardized JSON output with nearest sites, sectors, and technology.
        """
        column_blacklist = ['unnamed: 0', 'internal_id', 'temp_notes']
        
        u_lat = request_json['center']['lat']
        u_lon = request_json['center']['lon']
        techs = [t.upper() for t in request_json['technologies']]
        file_path = Path(request_json.get('file_path'))
        limit = request_json.get('limit', 6)
        
        print("find_nearest_sites")
        
        if not file_path.exists():
            return {"status": "error", "message": f"File not found: {file_path}"}

        df = self.reader.read_design_data(file_path)
        if df is None or df.empty:
            return {"status": "empty", "sites": []}
            
        # 1. Standardize and Map Columns for this file
        df.columns = df.columns.str.strip().str.lower()
        lat_col = find_standard_col(df.columns, 'lat')
        lon_col = find_standard_col(df.columns, 'lon')
        site_col = find_standard_col(df.columns, 'site', default=df.columns[0])
        cell_col = find_standard_col(df.columns, 'cell', default=site_col)
        azi_col = find_standard_col(df.columns, 'azi')
        
        if not lat_col or not lon_col:
            return {"status": "error", "message": "Missing geographic columns (lat/lon)."}
            
        # 2. Tech Detection (Prioritize column content, fallback to filename)
        tech = self._detect_tech(file_path.name)
        if cell_col and 'nrcell' in cell_col.lower():
            tech = "5G"
        elif cell_col and ('utran' in cell_col.lower() or 'lte' in cell_col.lower()):
            tech = "4G"
        print("tech")
        print(tech)
        
        # 3. Numeric Cleaning and Distance Calculation
        # Ensure values are strings, replace comma with dot, then convert to numeric
        df[lat_col] = pd.to_numeric(df[lat_col].astype(str).str.replace(',', '.'), errors='coerce')
        df[lon_col] = pd.to_numeric(df[lon_col].astype(str).str.replace(',', '.'), errors='coerce')
        
        # Remove any rows that couldn't be converted
        df = df.dropna(subset=[lat_col, lon_col])
        
        if df.empty: 
            return {"status": "empty", "sites": []}
        
        # Calculate distance using normalized numeric values
        df['distance_km'] = self._calculate_haversine(u_lat, u_lon, df[lat_col], df[lon_col])
        
        # 4. Group by Site ID and apply Limit
        unique_sites = df.sort_values('distance_km')[site_col].unique()[:limit]
        
        result_sites = []
        for sid in unique_sites:
            site_group = df[df[site_col] == sid]
            if site_group.empty: continue
           
            sectors_data = []
            for _, row in site_group.iterrows():
                # 1. Convert the FULL ROW to a dictionary
                # 2. Replace NaN with None (null in JSON) so FastAPI doesn't crash
                row_dict = {
                   k: (v if pd.notna(v) else None) 
                   for k, v in row.to_dict().items()
                }
               
                # 3. Explicitly map our 'Required' keys for the JS drawing engine
                # This keeps our visualization logic from breaking
                row_dict['cell_name'] = str(row_dict.get(cell_col, "Unknown"))
                row_dict['azimuth'] = int(row_dict.get(azi_col, 0)) if pd.notna(row_dict.get(azi_col)) else 0
                
                sectors_data.append(row_dict)

            top_row = site_group.iloc[0]
            result_sites.append({
                "site_id": str(sid),
                "technology": tech,
                "lat": float(top_row[lat_col]),
                "lon": float(top_row[lon_col]),
                "distance_km": round(float(top_row['distance_km']), 3),
                "sectors": sectors_data  # This now contains every single CSV column
            })
        
        print("result_sites")
        
        return {"status": "success", "sites": result_sites}


# --- 3. TEST BLOCK: Run this file directly to verify ---
if __name__ == "__main__":
    locator = GeoLocatorNearest()
    
    # Mock Request (Replace with real coordinates from your area)
    test_query = {
        "center": {"lat": 36.806, "lon": 10.181},
        "technologies": ["4G", "5G"],
        "limit": 3
    }
    
    print("--- TESTING GEO_LOCATOR_NEAREST ---")
    response = locator.find_nearest_sites(test_query)
    print(json.dumps(response, indent=2))