/**
 * KPI VISUAL MANAGER
 * Location: js/ui/kpi_visual_manager.js
 * Responsibility: Manages the right-sidebar UI and thematic mapping state.
 */
const KPIVisualManager = {
    // Registry of KPI configurations: { kpiName: { enabled, thresholds, colors, showLabels } }
    kpiConfigs: {},
    lastResults: null,
	
    /**
     * Initializes the manager with fresh extraction results
     */
	init(extractionResults) {
		this.lastResults = extractionResults;
		const container = document.getElementById('kpi-visual-controls');
		container.innerHTML = '';

		const uniqueKPIs = this._extractUniqueKPIs(extractionResults);
		
		// 1. Add the manual Mapping UI
		this.renderTAPlotterControls(uniqueKPIs);

		// 2. Add the standard thematic cards
		uniqueKPIs.forEach(kpiName => {
			const defaults = this._calculateAutoIntervals(kpiName, extractionResults);
			this._renderKPICard(kpiName, defaults);
		});
	},

    /**
     * Finds the min/max for a KPI and creates 3 equal intervals
     */
	_calculateAutoIntervals(kpiName, results) {
		let values = [];
		Object.values(results).forEach(file => {
			Object.values(file.cells).forEach(cell => {
				if (cell[kpiName]) {
					const val = cell[kpiName].value;
					// If it's a distribution array, push all individual numbers
					if (Array.isArray(val)) {
						val.forEach(v => { if (!isNaN(v) && v !== null) values.push(v); });
					} else if (typeof val === 'number') {
						values.push(val);
					}
				}
			});
		});

		if (values.length === 0) return { low: 0, mid: 0, colors: ['#27ae60', '#f1c40f', '#e74c3c'] };

		const min = Math.min(...values);
		const max = Math.max(...values);
		const step = (max - min) / 3;

		return {
			low: parseFloat((min + step).toFixed(2)),
			mid: parseFloat((min + 2 * step).toFixed(2)),
			colors: ['#27ae60', '#f1c40f', '#e74c3c']
		};
	},
	
	renderTAPlotterControls(uniqueKPIs) {
        const container = document.getElementById('kpi-visual-controls');
        
        const plotterDiv = document.createElement('div');
        plotterDiv.className = 'kpi-control-card ta-plotter-card';
        plotterDiv.style.borderLeft = "4px solid #9b59b6"; // Purple for TA
        
        const options = uniqueKPIs.map(k => `<option value="${k}">${k}</option>`).join('');

        plotterDiv.innerHTML = `
            <div style="font-weight:bold; margin-bottom:10px;">📐 Distance Plotter (TA)</div>
            <div class="input-row">
                <label>Distance (Index):</label>
                <select id="ta-vector-select">${options}</select>
            </div>
            <div class="input-row">
                <label>Magnitude (Users):</label>
                <select id="ta-value-select">${options}</select>
            </div>
            <button onclick="KPIVisualManager.applyDistancePlot()" style="width:100%; margin-top:10px;">
                Generate Distance Rings
            </button>
        `;
        container.prepend(plotterDiv); // Put it at the top of the sidebar
    },

	applyDistancePlot() {
		const vectorKey = document.getElementById('ta-vector-select').value;
		const valueKey = document.getElementById('ta-value-select').value;

		if (!this.lastResults) return;
		
		// Clear previous plots before drawing new ones to prevent "ghosting"
		MapManager.registry['PM'].clearLayers();
		
		// Hide 4G and 5G layers for a clear view
		['4G', '5G'].forEach(tech => {
			MapManager.setLayerVisibility(tech, false);
		});

		Object.values(this.lastResults).forEach(file => {
			Object.entries(file.cells).forEach(([cellId, kpis]) => {
				const vectorData = kpis[vectorKey]?.value; // e.g., [0, 1, 2...]
				const samplesData = kpis[valueKey]?.value; // e.g., [33, 1166, 11050...]

				if (Array.isArray(vectorData) && Array.isArray(samplesData)) {
					// Find the peak users in this cell for normalization
					const maxSamples = Math.max(...samplesData);
					
					const loopLength = Math.min(vectorData.length, samplesData.length);
					for (let i = 0; i < loopLength; i++) {
						const sampleCount = samplesData[i];
						if (sampleCount > 0) {
							// Calculate relative opacity (Peak = 0.8, Min = 0.1)
							const normalizedOpacity = (sampleCount / maxSamples) * 0.6; // Using a lower multiplier (0.6) for a softer aesthetic
							this.renderSingleTAPlot(cellId, vectorData[i], sampleCount, Math.max(normalizedOpacity, 0.05)); // lower multiplier (0.05) for a softer aesthetic
						}
					}
				}
			});
		});
	},

    _renderKPICard(name, data) {
        // Store in registry
        this.kpiConfigs[name] = {
            enabled: false,
            thresholds: [data.low, data.mid],
            colors: data.colors,
            showLabels: false
        };
		
        const card = document.createElement('div');
        card.className = 'kpi-control-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-weight:bold;">
                    <input type="checkbox" onchange="KPIVisualManager.updateState('${name}', 'enabled', this.checked)"> ${name}
                </label>
                <label style="font-size:0.8em;">
                    <input type="checkbox" onchange="KPIVisualManager.updateState('${name}', 'showLabels', this.checked)"> Labels
                </label>
            </div>
            <div class="legend-area" style="margin-top:10px;">
                <div class="legend-row">
                    <span class="color-indicator" style="background:${data.colors[0]}"></span>
                    <span><</span> <input type="number" value="${data.low}" onchange="KPIVisualManager.updateThreshold('${name}', 0, this.value)">
                </div>
                <div class="legend-row">
                    <span class="color-indicator" style="background:${data.colors[1]}"></span>
                    <span><</span> <input type="number" value="${data.mid}" onchange="KPIVisualManager.updateThreshold('${name}', 1, this.value)">
                </div>
                <div class="legend-row">
                    <span class="color-indicator" style="background:${data.colors[2]}"></span>
                    <span>></span> <span>Threshold</span>
                </div>
            </div>
        `;
        document.getElementById('kpi-visual-controls').appendChild(card);
    },

	updateState(name, key, value) {
        // If we are enabling a KPI, disable all others first (exclusive selection)
        if (key === 'enabled' && value === true) {
            Object.keys(this.kpiConfigs).forEach(k => { 
                if(k !== name) this.kpiConfigs[k].enabled = false; 
            });
            
            // Uncheck other physical checkboxes in the UI
            const allCheckboxes = document.querySelectorAll('#kpi-visual-controls input[type="checkbox"]');
            allCheckboxes.forEach(cb => {
                if (!cb.parentElement.innerText.includes(name) && !cb.parentElement.innerText.includes("Labels")) {
                    cb.checked = false;
                }
            });
        }

        // Update the internal registry
        if (this.kpiConfigs[name]) {
            this.kpiConfigs[name][key] = value;
        }
        
        // Automatically apply the change to the map
        this.applyThematic();
    },

    updateThreshold(name, index, value) {
        this.kpiConfigs[name].thresholds[index] = parseFloat(value);
        this.applyThematic();
    },

	/**
     * Orchestrates the map update.
     * This function finds the active KPI and updates every sector's color.
     */
    applyThematic() {
        // 1. Identify which KPI the user has checked in the sidebar
        const activeKPI = Object.keys(this.kpiConfigs).find(k => this.kpiConfigs[k].enabled);
        
        console.log("[DEBUG] Applying KPI:", activeKPI);

        // If no KPI is selected, stop here and tell the user
        if (!activeKPI) {
            alert("Please check a KPI checkbox first.");
            return;
        }

        // 2. Get the specific thresholds and colors for this KPI
        const config = this.kpiConfigs[activeKPI];
        
        // 3. Loop through all 4G and 5G sectors currently on the map
        let updateCount = 0;
        ['4G', '5G'].forEach(tech => {
			const layerGroup = MapManager.registry[tech];
			if (!layerGroup) return;
			
			layerGroup.eachLayer(layer => {
				this._styleLayer(layer, activeKPI, this.kpiConfigs[activeKPI]);
			});
			
        });
		
		this.createLegend(config, activeKPI);

        console.log(`[DEBUG] Successfully updated ${updateCount} sectors.`);
    },

    _styleLayer(layer, kpiName, config) {
		if (!layer.options || !layer.options.cellId) return;
        const cellId = layer.options.cellId;
		const tech = layer.options.tech;
        let kpiValue = null;

        // Find value in results
        if (kpiName && this.lastResults) {
            Object.values(this.lastResults).forEach(file => {
                if (file.cells[cellId] && file.cells[cellId][kpiName]) {
                    kpiValue = file.cells[cellId][kpiName].value;
                }
            });
        }

        if (kpiValue !== null && config) {
            let color = config.colors[2]; // Default high
            if (kpiValue < config.thresholds[0]) color = config.colors[0];
            else if (kpiValue < config.thresholds[1]) color = config.colors[1];

            layer.setStyle({ fillColor: color, fillOpacity: 0.8 });
            
            if (config.showLabels) {
                layer.setTooltipContent(`<b>${cellId}</b><br>${kpiName}: ${kpiValue.toFixed(2)}`).openTooltip();
            } else {
                layer.setTooltipContent(layer.options.defaultTooltip);
            }
        } else {
            // Reset to original band color if not active
            const original = SiteLayer._getBandSettings(layer.options.cellName, tech);
            layer.setStyle({ fillColor: original.color, fillOpacity: 0.4 });
        }
    },

    _extractUniqueKPIs(results) {
        const names = new Set();
        Object.values(results).forEach(f => Object.values(f.cells).forEach(c => Object.keys(c).forEach(k => names.add(k))));
        return Array.from(names);
    },
	
	/**
     * Resets all sectors to their original frequency band colors.
     */
    resetMap() {
        console.log("[VISUAL] Restoring original band colors...");
        
		// 1. Remove the map legend if it exists
		if (this.mapLegend) {
			this.mapLegend.remove();
			this.mapLegend = null;
		}

		// 2. Clear the Distribution (TA) layer group explicitly
		if (MapManager.registry['PM']) {
			MapManager.registry['PM'].clearLayers();
		}
		
		// 3. Reset standard sector layers (4G/5G)
        ['4G', '5G'].forEach(tech => {
            MapManager.registry[tech].eachLayer(layer => {
				if (!layer.options || !layer.options.cellId) return;
                // Get the original color (e.g., L800 blue, L1800 orange)
                const original = SiteLayer._getBandSettings(layer.options.cellName, tech);
                
                // Set the style back to default
                layer.setStyle({ 
                    fillColor: original.color, 
                    fillOpacity: 0.4,
                    color: original.color 
                });
                
                // Restore the original text when you hover over the sector
                layer.setTooltipContent(layer.options.defaultTooltip || "Cell Info");
            });
        });

        // 4. Uncheck all KPI checkboxes in the UI
        const checkboxes = document.querySelectorAll('#kpi-visual-controls input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    },
	
	/**
     * Dynamically creates a map legend based on the current KPI thresholds.
     */
    createLegend(config, kpiName) {
        
		// Remove existing legend if there is one
        if (this.mapLegend) {
            this.mapLegend.remove();
        }

        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend');
            const thresholds = config.thresholds;
            const colors = config.colors;

            div.innerHTML = `<strong>${kpiName}</strong><br>`;

            // Range 1: Green (Good)
            div.innerHTML += `<i style="background:${colors[0]}"></i> < ${thresholds[0]}<br>`;
            // Range 2: Yellow (Warning)
            div.innerHTML += `<i style="background:${colors[1]}"></i> ${thresholds[0]} - ${thresholds[1]}<br>`;
            // Range 3: Red (Critical)
            div.innerHTML += `<i style="background:${colors[2]}"></i> > ${thresholds[1]}`;

            return div;
        };

        this.mapLegend = legend;
        legend.addTo(MapManager.map);
    },
	
	/**
	 * Renders TA Distribution as normalized distance rings
	 */
	renderTADistribution(cellId, vectorData) {
		const site = this._findSiteByCell(cellId);
		const cellColor = this._generateCellColor(cellId); // One color per cell
		const maxSamples = Math.max(...vectorData.map(v => v.samples));

		vectorData.forEach(bin => {
			const opacity = (bin.samples / maxSamples) * 0.9;
			const coords = SpatialUtils.getDistributiveArc(
				site.lat, site.lon, site.azimuth, 
				bin.index * 156, (bin.index + 1) * 156
			);

			L.polygon(coords, {
				fillColor: cellColor,
				fillOpacity: Math.max(opacity, 0.05), // Low count = transparent
				color: cellColor,
				weight: 0.5
			}).addTo(MapManager.registry['PM']);
		});
	},

	_generateCellColor(cellId) {
		let hash = 0;
		for (let i = 0; i < cellId.length; i++) {
			hash = cellId.charCodeAt(i) + ((hash << 5) - hash);
		}
		return `hsl(${Math.abs(hash % 360)}, 70%, 50%)`;
	},
	
	/**
	 * Renders a distance-accurate polygon for TA Distribution
	 * Uses one color per cell with opacity based on user count.
	 */
	renderSingleTAPlot(cellId, vectorValue, userCount, opacity) {
		const site = this._findSiteByCell(cellId);
		if (!site) return;

		const centerDistance = vectorValue * 156; // 156m per TA step
		const coords = SpatialUtils.getDistributiveArc(
			site.lat, site.lon, site.azimuth, 
			centerDistance - 78, centerDistance + 78, 65
		);

		const cellColor = this._generateCellColor(cellId);

		L.polygon(coords, {
			fillColor: cellColor,
			fillOpacity: opacity *0.7, // Scaled down for "softer" appearance
			color: cellColor,  // Border matches fill color
			weight: 1,  // Thinner border
			opacity: 0.2,  // Very soft border opacity
			dashArray: '3, 3',
			interactive: true
		}).bindTooltip(`Cell: ${cellId}<br>Samples: ${userCount}<br>Dist: ${centerDistance.toFixed(0)}m`)
		  .addTo(MapManager.registry['PM']);
	},

	
	_findSiteByCell(cellId) {
		let siteData = null;
		['4G', '5G'].forEach(tech => {
			const layerGroup = MapManager.registry[tech];
			if (!layerGroup) return;

			layerGroup.eachLayer(layer => {
				// Check if this specific layer matches the Cell ID
				if (layer.options && layer.options.cellId === cellId) {
					// The first point of the polygon is always the tower center
					const latlngs = layer.getLatLngs()[0]; 
					siteData = {
						lat: latlngs[0].lat, 
						lon: latlngs[0].lng,
						azimuth: layer.options.azimuth || 0
					};
				}
			});
		});
		return siteData;
	}
	

};



const KPI_METADATA = {
    // Signal Quality KPIs - Higher is Better
    'RSRP': { direction: 'higher-better', unit: 'dBm', typicalRange: [-120, -70] },
    'RSRQ': { direction: 'higher-better', unit: 'dB', typicalRange: [-20, -3] },
    'SINR': { direction: 'higher-better', unit: 'dB', typicalRange: [-10, 25] },
    
    // Load KPIs - Direction depends on context
    'PRB Utilization': { direction: 'contextual', unit: '%', typicalRange: [0, 100] },
    
    // Problem KPIs - Lower is Better  
    'Call Drop Rate': { direction: 'lower-better', unit: '%', typicalRange: [0, 10] },
    
    // Default for unknown KPIs
    'DEFAULT': { direction: 'unknown', unit: '', typicalRange: null }
};

