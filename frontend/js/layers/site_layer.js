// frontend/js/layers/site_layer.js

/**
 * SITE LAYER MANAGER
 * Responsibility: Translate Backend Site/Sector JSON into Map Objects.
 * Uses: SpatialUtils for geometry and MapManager for the stage.
 */

// --- 1. AJOUT DES RÈGLES DE CONFIGURATION DYNAMIQUES ---
const DYNAMIC_BAND_RULES = {
    "2G_900": { radius: 450, width: 65, color: "#8e44ad", label: "2G_900" },
    "2G_1800": { radius: 350, width: 60, color: "#9b59b6", label: "2G_1800" },
    "3G_900": { radius: 450, width: 65, color: "#3498db", label: "3G_900" },
    "3G_2100": { radius: 250, width: 70, color: "#2980b9", label: "3G_2100" },
    "4G_800": { radius: 450, width: 30, color: "#3498db", label: "L800" },
    "4G_1800": { radius: 300, width: 45, color: "#3fecf8", label: "L1800" },
    "4G_2100": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
    "4G_2600": { radius: 200, width: 55, color: "#00d7ff", label: "L2600" },
    "5G_1800": { radius: 280, width: 50, color: "#e9a30d", label: "N3" },
    "5G_3500": { radius: 200, width: 70, color: "#cc0e0e", label: "N78" }
};

const BAND_MAPPING = {
    "2G": { "900": [[1, 124], [975, 1023]], "1800": [[512, 885]] },
    "3G": { "900": [[2937, 3088]], "2100": [[10562, 10838]] },
    "4G": { "800": [[6150, 6449]], "1800": [[1200, 1949]], "2100": [[0, 599]], "2600": [[2750, 3449]] },
    "5G": { "1800": [[361000, 376000]], "3500": [[620000, 653333]] }
};
 
const BAND_CONFIG = {
	"2G": {
		"A": { radius: 450, width: 65, color: "#8e44ad", label: "GSM900" },
		"B": { radius: 450, width: 65, color: "#8e44ad", label: "GSM900" },
		"C": { radius: 450, width: 65, color: "#8e44ad", label: "GSM900" },
		"D": { radius: 450, width: 65, color: "#8e44ad", label: "GSM900" },
		"1800": { radius: 450, width: 60, color: "#9b59b6", label: "GSM1800" },
		"DEFAULT": { radius: 450, width: 65, color: "#8e44ad", label: "2G" }
	},
	
	"3G": {
		"O": { radius: 400, width: 65, color: "#3498db", label: "UMTS900" },
		"P": { radius: 400, width: 65, color: "#3498db", label: "UMTS900" },
		"Q": { radius: 400, width: 65, color: "#3498db", label: "UMTS900" },
		"X": { radius: 300, width: 70, color: "#2980b9", label: "UMTS2100" },
		"Y": { radius: 300, width: 70, color: "#2980b9", label: "UMTS2100" },
		"Z": { radius: 300, width: 70, color: "#2980b9", label: "UMTS2100" },
		"U": { radius: 250, width: 75, color: "#2980b9", label: "UMTS2100" },
		"V": { radius: 250, width: 75, color: "#2980b9", label: "UMTS2100" },
		"W": { radius: 250, width: 75, color: "#2980b9", label: "UMTS2100" },
		"M": { radius: 250, width: 75, color: "#2980b9", label: "UMTS2100" },
		"DEFAULT": { radius: 250, width: 70, color: "#2980b9", label: "3G" }
	},	

    "4G": {    
		"O": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"P": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"Q": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"N": { radius: 400, width: 30, color: "#3498db", label: "L800" },
		"X": { radius: 300, width: 45, color: "#3fecf8", label: "L1800" },
		"Y": { radius: 300, width: 45, color: "#3fecf8", label: "L1800" },
		"Z": { radius: 300, width: 45, color: "#3fecf8", label: "L1800" },
		"L": { radius: 300, width: 45, color: "#3fecf8", label: "L1800" },
		"A": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
		"B": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
		"C": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
		"D": { radius: 200, width: 65, color: "#27ae60", label: "L2100" },
	},
	
	"5G": {
		"R": { radius: 200, width: 70, color: "#cc0e0e", label: "N78" },
		"S": { radius: 200, width: 70, color: "#cc0e0e", label: "N78" },
		"T": { radius: 200, width: 70, color: "#cc0e0e", label: "N78" },
		"X": { radius: 280, width: 50, color: "#e9a30d", label: "N3" },
		"Y": { radius: 280, width: 50, color: "#e9a30d", label: "N3" },
		"Z": { radius: 280, width: 50, color: "#e9a30d", label: "N3" },
	},
    
    "DEFAULT": { radius: 200, width: 360, color: "#3a3b3b", label: "Unknown" }
};


const SiteLayer = {
    isVerbose: true,

	layers: {
		'2G': null, '3G': null, '4G': null, '5G': null,
		'PM': null, 'TA': null, 'CM': null, 'Mesurements': null, 'CUSTOM': null
    },
	
	// --- 2. LOGIQUE INTELLIGENTE DE RÉCUPÉRATION DES BANDES ---
	_getBandSettings(sector, tech) {
        const freq = this._extractSectorFrequency(sector, tech);
        if (freq !== null && BAND_MAPPING[tech]) {
            const bandName = this._matchFrequencyToBand(tech, freq);
            if (bandName) {
                const ruleKey = `${tech}_${bandName}`;
                if (DYNAMIC_BAND_RULES[ruleKey]) {
                    return DYNAMIC_BAND_RULES[ruleKey];
                }
            }
        }

        // Repli sur l'ancienne méthode par suffixe si la fréquence n'est pas trouvée
        if (sector.cell_name) {
            const suffix = sector.cell_name.slice(-1).toUpperCase();
            if (BAND_CONFIG[tech] && BAND_CONFIG[tech][suffix]) {
                return BAND_CONFIG[tech][suffix];
            }
        }

        return BAND_CONFIG[tech]?.["DEFAULT"] || BAND_CONFIG["DEFAULT"];
	}, 

    _extractSectorFrequency(sector, tech) {
        switch (tech) {
            case '2G': return sector.bcch !== undefined ? Number(sector.bcch) : null;
            case '3G': return sector.uarfcndl !== undefined ? Number(sector.uarfcndl) : null;
            case '4G': return sector.earfcndl !== undefined ? Number(sector.earfcndl) : null;
            case '5G': return sector.ssbfrequency !== undefined ? Number(sector.ssbfrequency) : null;
            default: return null;
        }
    },

    _matchFrequencyToBand(tech, freq) {
        const techMappings = BAND_MAPPING[tech];
        if (!techMappings) return null;
        for (const [bandName, ranges] of Object.entries(techMappings)) {
            for (const [min, max] of ranges) {
                if (freq >= min && freq <= max) return bandName;
            }
        }
        return null;
    },
	
	getCurrentCellIds() {
        const cellIds = [];
        Object.values(this.layers).forEach(group => {
            if (group && typeof group.eachLayer === 'function') {
                group.eachLayer(polygon => {
                    if (polygon.options && polygon.options.cellId) {
                        cellIds.push(polygon.options.cellId);
                    }
                });
            }
        });
        return cellIds;
    },
	
	render(sites) {
		this._log(`Processing ${sites.length} sites for visualization...`);

		sites.forEach(site => {
			const tech = site.technology; 
			const siteLat = site.lat;
			const siteLon = site.lon;
			
			this._addSiteLabel(siteLat, siteLon, site.site_id, tech);

            if (!site.sectors || !Array.isArray(site.sectors)) return;

			const sortedSectors = [...site.sectors].sort((a, b) => {
				const configA = this._getBandSettings(a, tech);
				const configB = this._getBandSettings(b, tech);
				return configB.radius - configA.radius;
			});

			sortedSectors.forEach(sector => {
				this._drawSector(site.site_id, tech, siteLat, siteLon, sector);
			});
		});
	},
	
	_addSiteLabel(lat, lon, siteId, tech) {
		const labelIcon = L.divIcon({
			className: 'site-label',
			html: siteId,
			iconSize: [60, 12],
			iconAnchor: [30, 6]
		});

		L.marker([lat, lon], { 
			icon: labelIcon,
			interactive: false,
			zIndexOffset: 1000 
		}).addTo(MapManager.registry[tech.toUpperCase()] || MapManager.map);
	},

	_drawSector(siteId, tech, lat, lon, sector) {
		const azimuth = sector.azimuth !== undefined ? sector.azimuth : (sector.azimut !== undefined ? sector.azimut : 0);
		const cellName = sector.cell_name || "Unknown";
		
		const extraInfo = Object.entries(sector)
			.filter(([key]) => !['cell_name', 'azimuth', 'azimut', 'distance_km'].includes(key))
			.map(([key, val]) => `<b>${key}:</b> ${val}`)
			.join('<br>');

		const config = this._getBandSettings(sector, tech);
		const beamwidth = sector.bw || sector.ant_bw || config.width;

		const wedgeCoords = SpatialUtils.getSectorWedge(
			lat, lon, azimuth, config.radius, beamwidth
		);

		const tooltipContent = `
			<div style="font-size: 1.1em; border-bottom: 1px solid #ccc; margin-bottom: 5px;">
				<b>Cell:</b> ${cellName}
			</div>
			<b>Azi:</b> ${azimuth}°<br>
			${extraInfo} 
		`;

		const polygon = L.polygon(wedgeCoords, {
			color: config.color,       
			fillColor: config.color,   
			fillOpacity: 0.4,          
			weight: 1.5,
			siteId: siteId,
			cellName: cellName,
			cellId: sector.cell_id || sector.ci || sector.localcellid || sector.utrancell || sector.eutrancell_id || sector.nrcelldu,
			tech: tech,
			azimuth: azimuth,
			defaultTooltip: tooltipContent
		});

		polygon.bindTooltip(tooltipContent);

		// Correction ici avec .toUpperCase() pour cibler le bon calque (3G, 4G, etc.)
		const targetGroup = MapManager.registry[tech.toUpperCase()] || MapManager.registry['4G'];
		if (targetGroup) {
			targetGroup.addLayer(polygon);
		}
	},
	
	renderTA(cellData) {
		const stepMeters = 156; 
		cellData.vectors.forEach(bin => {
			if (bin.value > 0) {
				const inner = bin.index * stepMeters;
				const outer = (bin.index + 1) * stepMeters;
				
				const coords = SpatialUtils.getDistributiveArc(
					lat, lon, azimuth, inner, outer
				);
				
				L.polygon(coords, {
					fillColor: this.getTAColor(bin.index),
					fillOpacity: bin.normalizedWeight,
					stroke: false
				}).addTo(MapManager.registry['PM']);
			}
		});
	},

    _log(msg) {
        if (this.isVerbose) console.log(`%c[SITE_LAYER] ${msg}`, "color: #e67e22; font-weight: bold;");
    }
};