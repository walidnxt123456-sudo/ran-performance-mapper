// frontend/js/map/spatial_utils.js

/**
 * SPATIAL UTILITIES
 * Pure math functions for RF geometry.
 */
const SpatialUtils = {
    /**
     * Creates a triangle (sector wedge)
     * @param {number} lat - Origin Latitude
     * @param {number} lon - Origin Longitude
     * @param {number} azimuth - Direction in degrees
     * @param {number} distance - Length of wedge in meters
     * @param {number} beamwidth - Width of wedge in degrees
     */
    getSectorWedge(lat, lon, azimuth, distance = 200, beamwidth = 65) {
        const d_lat = distance / 111320; // Approx meters to lat degrees
        const d_lon = distance / (111320 * Math.cos(lat * (Math.PI / 180)));

        const angle1 = (azimuth - beamwidth / 2) * (Math.PI / 180);
        const angle2 = (azimuth + beamwidth / 2) * (Math.PI / 180);

        const p1 = [
            lat + d_lat * Math.cos(angle1),
            lon + d_lon * Math.sin(angle1)
        ];
        const p2 = [
            lat + d_lat * Math.cos(angle2),
            lon + d_lon * Math.sin(angle2)
        ];

        return [[lat, lon], p1, p2]; // Triangle coordinates for Leaflet
    }
};