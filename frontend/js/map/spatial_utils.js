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
/*    
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
*/	
	getSectorWedge(lat, lon, azimuth, distance = 200, beamwidth = 65) {
		const points = [[lat, lon]]; // Start at the site center
		const startAngle = azimuth - beamwidth / 2;
		const endAngle = azimuth + beamwidth / 2;

		// Generate points every 5 degrees to create a curve
		for (let i = startAngle; i <= endAngle; i += 5) {
			const rad = i * (Math.PI / 180);
			const p_lat = lat + (distance / 111320) * Math.cos(rad);
			const p_lon = lon + (distance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
			points.push([p_lat, p_lon]);
		}

		return points; 
	},
	

	/**
	 * Creates a ring-slice (annular sector) for distribution KPIs
	 * @param {number} innerDist - Inner radius in meters
	 * @param {number} outerDist - Outer radius in meters
	 */
	getDistributiveArc(lat, lon, azimuth, innerDist, outerDist, beamwidth = 65) {
		const points = [];
		const startAngle = (azimuth - beamwidth / 2) * (Math.PI / 180);
		const endAngle = (azimuth + beamwidth / 2) * (Math.PI / 180);

		// Outer edge curve[cite: 14]
		for (let i = startAngle; i <= endAngle; i += 0.05) {
			points.push([
				lat + (outerDist / 111320) * Math.cos(i),
				lon + (outerDist / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(i)
			]);
		}
		// Inner edge curve (reverse)[cite: 14]
		for (let i = endAngle; i >= startAngle; i -= 0.05) {
			points.push([
				lat + (innerDist / 111320) * Math.cos(i),
				lon + (innerDist / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(i)
			]);
		}
		return points;
	}
	
};