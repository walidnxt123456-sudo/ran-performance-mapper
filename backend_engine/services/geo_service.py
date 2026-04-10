# backend_engine/services/geo_service.py
import math

class GeoService:
    def __init__(self, site_db):
        """Initializes with the session-specific cell database."""
        self.site_db = site_db 

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Standard Haversine formula for distance calculation."""
        R = 6371 # Earth radius in km
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) ** 2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def get_wedge_points(self, lat, lon, azimuth, beamwidth=65, radius=0.005):
        """Calculates the three points of a triangle to represent a cell sector."""
        # Convert azimuth to mathematical polar coordinates
        start_angle = math.radians(90 - (azimuth - beamwidth / 2))
        end_angle = math.radians(90 - (azimuth + beamwidth / 2))
        
        # Point 1: The Site Center
        p1 = [lat, lon]
        
        # Point 2 & 3: The edge of the sector wedge
        p2 = [lat + radius * math.sin(start_angle), lon + radius * math.cos(start_angle)]
        p3 = [lat + radius * math.sin(end_angle), lon + radius * math.cos(end_angle)]
        
        return [p1, p2, p3]