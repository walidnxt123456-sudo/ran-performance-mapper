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
                if (cell[kpiName]) values.push(cell[kpiName].value);
            });
        });

        const min = Math.min(...values);
        const max = Math.max(...values);
        const step = (max - min) / 3;

        return {
            low: parseFloat((min + step).toFixed(2)),
            mid: parseFloat((min + 2 * step).toFixed(2)),
            colors: ['#27ae60', '#f1c40f', '#e74c3c'] // Green, Yellow, Red
        };
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

        console.log(`[DEBUG] Successfully updated ${updateCount} sectors.`);
    },

    _styleLayer(layer, kpiName, config) {
        const cellId = layer.options.cellId;
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
            const original = SiteLayer._getBandSettings(layer.options.cellName);
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
        
        ['4G', '5G'].forEach(tech => {
            MapManager.registry[tech].eachLayer(layer => {
                // Get the original color (e.g., L800 blue, L1800 orange)
                const original = SiteLayer._getBandSettings(layer.options.cellName);
                
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

        // Uncheck all KPI checkboxes in the UI
        const checkboxes = document.querySelectorAll('#kpi-visual-controls input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    },

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
