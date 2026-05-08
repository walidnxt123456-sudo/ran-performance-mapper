// frontend/js/layers/site_layer.js

/**
 * SITE LAYER MANAGER
 * Responsibility: Translate Backend Site/Sector JSON into Map Objects.
 * Uses: SpatialUtils for geometry and MapManager for the stage.
 */
 
const BAND_CONFIG = {
    "4G": {    
		// 4G Suffixes
		// 4G Coverage (e.g., L800 / L900)
		"O": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"P": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"Q": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"N": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		
		// 4G Capacity (e.g., L1800 )
		"X": { radius: 300, width: 45, color: "#e67e22", label: "L1800" },
		"Y": { radius: 300, width: 45, color: "#e67e22", label: "L1800" },
		"Z": { radius: 300, width: 45, color: "#e67e22", label: "L1800" },
		"L": { radius: 300, width: 45, color: "#e67e22", label: "L1800" },

		// 4G Capacity (e.g., L2100)
		"A": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
		"B": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
		"C": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
		"D": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
	},
	
	"5G": {
		// 5G Suffixes
		// 5G for N78
		"R": { radius: 200, width: 70, color: "#2ecc71", label: "N78" },
		"S": { radius: 200, width: 70, color: "#2ecc71", label: "N78" },
		"T": { radius: 200, width: 70, color: "#2ecc71", label: "N78" },

		// 5G for N3
		"X": { radius: 280, width: 50, color: "#2ecc71", label: "N3" },
		"Y": { radius: 280, width: 50, color: "#2ecc71", label: "N3" },
		"Z": { radius: 280, width: 50, color: "#2ecc71", label: "N3" },
	},
    
    // Default fallback if suffix isn't found
    "DEFAULT": { radius: 200, width: 65, color: "#95a5a6", label: "Unknown" }
};


const SiteLayer = {
    isVerbose: true,

    /**
     * Main entry point for drawing sites
     * @param {Array} sites - The 'sites' array from your Backend JSON
     */
	// Registry to keep track of rendered groups
	layers: {
        '4G': null,
        '5G': null
    },
	
	_getBandSettings(cellName, tech) {
		const suffix = cellName.slice(-1).toUpperCase();
		
		// Check if the technology exists in config, then check the suffix
		if (BAND_CONFIG[tech] && BAND_CONFIG[tech][suffix]) {
			return BAND_CONFIG[tech][suffix];
		}
		
		return BAND_CONFIG["DEFAULT"];
	}, 
	
	/**
     * HELPER: Returns a flat list of all Cell IDs currently rendered.
     */
	getCurrentCellIds() {
        const cellIds = [];
        // Safely iterate through 4G and 5G groups
        Object.values(this.layers).forEach(group => {
            if (group && typeof group.eachLayer === 'function') {
                group.eachLayer(polygon => {
                    // Check the options where we stored the ID
                    if (polygon.options && polygon.options.cellId) {
                        cellIds.push(polygon.options.cellId);
                    }
                });
            }
        });
        return cellIds;
    },
	
	// Ensure your render method attaches the cell_id to the marker:
    _createSector(site, sector) {
        return L.polygon(coords, {
            color: '#333',
            fillColor: '#3498db',
            fillOpacity: 0.6,
            weight: 1,
            cell_id: sector.cell_id, // IMPORTANT: Store the ID here so we can find it later
            site_id: site.site_id
        });
    },
	
	render(sites) {
		this._log(`Processing ${sites.length} sites for visualization...`);

		sites.forEach(site => {
			const tech = site.technology; 
			const siteLat = site.lat;
			const siteLon = site.lon;
			
			//Add site label
			this._addSiteLabel(siteLat, siteLon, site.site_id, tech);

			// 1. Sort sectors by radius (Descending) 
			// We use a spread [...site.sectors] to avoid mutating the original data
			const sortedSectors = [...site.sectors].sort((a, b) => {
				const configA = this._getBandSettings(a.cell_name, tech);
				const configB = this._getBandSettings(b.cell_name, tech);
				
				// Larger radius (e.g. 280) comes first in the array
				// Smaller radius (e.g. 180) comes last so it is drawn "on top"
				return configB.radius - configA.radius;
			});

			// 2. Loop through the sorted sectors to draw them in the correct order
			sortedSectors.forEach(sector => {
				this._drawSector(site.site_id, tech, siteLat, siteLon, sector);
			});
		});
	},
	
	/**
	* Creates a permanent text label at the site location
	*/
	_addSiteLabel(lat, lon, siteId, tech) {
		const labelIcon = L.divIcon({
			className: 'site-label', // The CSS handles visibility now!
			html: siteId,
			iconSize: [60, 12],
			iconAnchor: [30, 6]
		});

		L.marker([lat, lon], { 
			icon: labelIcon,
			interactive: false,
			zIndexOffset: 1000 
		}).addTo(MapManager.registry[tech]);
	},

    /**
     * Draws an individual sector wedge
     */
/*	_drawSector(siteId, tech, lat, lon, sector) {
		const azimuth = sector.azimuth;
		const cellName = sector.cell_name;
		// This helper creates a list of all extra parameters
		const extraInfo = Object.entries(sector)
			.filter(([key]) => !['cell_name', 'azimuth', 'distance_km'].includes(key)) // Skip what we already show
			.map(([key, val]) => `<b>${key}:</b> ${val}`)
			.join('<br>');

		// 1. Get settings from our helper
		const config = this._getBandSettings(cellName);

		// 2. Generate geometry
		const wedgeCoords = SpatialUtils.getSectorWedge(
			lat, lon, azimuth, config.radius, config.width
		);

		const tooltipContent = `
			<div style="font-size: 1.1em; border-bottom: 1px solid #ccc; margin-bottom: 5px;">
				<b>Cell:</b> ${cellName}
			</div>
			<b>Azi:</b> ${azimuth}°<br>
			${extraInfo} 
		`;
		// 3. Create Polygon with specific color and transparency
		const polygon = L.polygon(wedgeCoords, {
			color: config.color,       // Border Color
			fillColor: config.color,   // Inner Color
			fillOpacity: 0.4,          // Allows overlapping bands to be visible
			weight: 1.5,
			siteId: siteId,
			cellName: sector.cell_name,
			cellId: sector.cell, // STORE THIS FOR EXTRACTION
			defaultTooltip: tooltipContent
		});

		// 4. Update Tooltip to show the Band Label
		polygon.bindTooltip(tooltipContent);

		MapManager.registry[tech].addLayer(polygon);
	},
*/	
	/**
     * Draws an individual sector wedge (Arc Form)
     */
	_drawSector(siteId, tech, lat, lon, sector) {
		const azimuth = sector.azimuth;
		const cellName = sector.cell_name;
		
		const extraInfo = Object.entries(sector)
			.filter(([key]) => !['cell_name', 'azimuth', 'distance_km'].includes(key))
			.map(([key, val]) => `<b>${key}:</b> ${val}`)
			.join('<br>');

		// 1. Get frequency band settings (Radius/Color)
		const config = this._getBandSettings(cellName, tech);

		// 2. Generate Arc geometry (uses the 5-degree step loop for curves)
		const wedgeCoords = SpatialUtils.getSectorWedge(
			lat, lon, azimuth, config.radius, config.width
		);

		const tooltipContent = `
			<div style="font-size: 1.1em; border-bottom: 1px solid #ccc; margin-bottom: 5px;">
				<b>Cell:</b> ${cellName}
			</div>
			<b>Azi:</b> ${azimuth}°<br>
			${extraInfo} 
		`;

		// 3. Create Polygon (The Wedge)
		const polygon = L.polygon(wedgeCoords, {
			color: config.color,       
			fillColor: config.color,   
			fillOpacity: 0.4,          
			weight: 1.5,
			siteId: siteId,
			cellName: cellName,
			cellId: sector.cell, // CRITICAL: This links map objects to PM data
			azimuth: azimuth,
			defaultTooltip: tooltipContent
		});

		polygon.bindTooltip(tooltipContent);

		// 4. Add to the correct Leaflet Group (4G or 5G)
		MapManager.registry[tech].addLayer(polygon);
	},
	
	renderTA(cellData) {
		const stepMeters = 156; // Standard TA step
		
		cellData.vectors.forEach(bin => {
			if (bin.value > 0) {
				const inner = bin.index * stepMeters;
				const outer = (bin.index + 1) * stepMeters;
				
				const coords = SpatialUtils.getDistributiveArc(
					lat, lon, azimuth, inner, outer
				);
				
				L.polygon(coords, {
					fillColor: this.getTAColor(bin.index),
					fillOpacity: bin.normalizedWeight, // More samples = more solid color
					stroke: false
				}).addTo(MapManager.registry['PM']);
			}
		});
	},

    _log(msg) {
        if (this.isVerbose) console.log(`%c[SITE_LAYER] ${msg}`, "color: #e67e22; font-weight: bold;");
    }
};

