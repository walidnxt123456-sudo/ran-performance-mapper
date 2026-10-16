// frontend/js/ui/dt_visual_manager.js

const DriveTestVisualManager = {
    dtConfigs: {},
    lastDtData: null,
    mapLegend: null,

    init(dtData, selectedMetrics) {
        this.lastDtData = dtData;
        const container = document.getElementById('kpi-visual-controls');
        if (!container) return;

        container.innerHTML = ''; // Nettoyer les contrôles PM pour laisser place au DT

        if (!selectedMetrics || selectedMetrics.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Aucune métrique DT sélectionnée...</p>';
            return;
        }

        selectedMetrics.forEach(metricName => {
            const defaults = this._calculateAutoIntervals(metricName, dtData);
            this._renderDTCard(metricName, defaults);
        });

        console.log("[DT_VISUAL] Panneau latéral droit initialisé pour les métriques DT.");
    },

    _calculateAutoIntervals(metricName, dataPoints) {
        let values = [];
        dataPoints.forEach(pt => {
            const val = parseFloat(pt[metricName]);
            if (!isNaN(val)) values.push(val);
        });

        if (values.length === 0) return { low: -100, mid: -85, colors: ['#e74c3c', '#f1c40f', '#2ecc71'] };

        const min = Math.min(...values);
        const max = Math.max(...values);
        const step = (max - min) / 3;

        return {
            low: parseFloat((min + step).toFixed(2)),
            mid: parseFloat((min + 2 * step).toFixed(2)),
            colors: ['#e74c3c', '#f1c40f', '#2ecc71'] // Rouge (Faible), Jaune (Moyen), Vert (Bon)
        };
    },

    _renderDTCard(name, data) {
        this.dtConfigs[name] = {
            enabled: false,
            thresholds: [data.low, data.mid],
            colors: data.colors,
            showLabels: false
        };

        const container = document.getElementById('kpi-visual-controls');
        const card = document.createElement('div');
        card.className = 'kpi-control-card';
        card.style.borderLeft = "4px solid #3498db"; // Bleu DT

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-weight:bold;">
                    <input type="checkbox" onchange="DriveTestVisualManager.updateState('${name}', 'enabled', this.checked)"> [DT] ${name}
                </label>
                <label style="font-size:0.8em;">
                    <input type="checkbox" onchange="DriveTestVisualManager.updateState('${name}', 'showLabels', this.checked)"> Labels
                </label>
            </div>
            <div class="legend-area" style="margin-top:10px;">
                <div class="legend-row">
                    <span class="color-indicator" style="background:${data.colors[0]}"></span>
                    <span><</span> <input type="number" value="${data.low}" onchange="DriveTestVisualManager.updateThreshold('${name}', 0, this.value)">
                </div>
                <div class="legend-row">
                    <span class="color-indicator" style="background:${data.colors[1]}"></span>
                    <span><</span> <input type="number" value="${data.mid}" onchange="DriveTestVisualManager.updateThreshold('${name}', 1, this.value)">
                </div>
                <div class="legend-row">
                    <span class="color-indicator" style="background:${data.colors[2]}"></span>
                    <span>></span> <span>Seuil Haut</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    },

    updateState(name, key, value) {
        if (key === 'enabled' && value === true) {
            // Sélection exclusive des métriques DT
            Object.keys(this.dtConfigs).forEach(k => {
                if (k !== name) this.dtConfigs[k].enabled = false;
            });

            const allCheckboxes = document.querySelectorAll('#kpi-visual-controls input[type="checkbox"]');
            allCheckboxes.forEach(cb => {
                if (!cb.parentElement.innerText.includes(name) && !cb.parentElement.innerText.includes("Labels")) {
                    cb.checked = false;
                }
            });
        }

        if (this.dtConfigs[name]) {
            this.dtConfigs[name][key] = value;
        }

        this.applyThematic();
    },

    updateThreshold(name, index, value) {
        this.dtConfigs[name].thresholds[index] = parseFloat(value);
        this.applyThematic();
    },

    applyThematic() {
        const activeMetric = Object.keys(this.dtConfigs).find(k => this.dtConfigs[k].enabled);
        
        if (!activeMetric || !this.lastDtData) {
            if (MapManager.driveTestLayer) {
                MapManager.driveTestLayer.renderPoints(this.lastDtData, 'DT', []); // Affichage par défaut sans coloration active
            }
            this.removeLegend();
            return;
        }

        const config = this.dtConfigs[activeMetric];
        if (MapManager.driveTestLayer) {
            MapManager.driveTestLayer.renderThematicPoints(this.lastDtData, activeMetric, config);
        }

        this.createLegend(config, activeMetric);
    },

    createLegend(config, metricName) {
        this.removeLegend();

        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend');
            const thresholds = config.thresholds;
            const colors = config.colors;

            div.innerHTML = `<strong>DT: ${metricName}</strong><br>`;
            div.innerHTML += `<i style="background:${colors[0]}"></i> < ${thresholds[0]}<br>`;
            div.innerHTML += `<i style="background:${colors[1]}"></i> ${thresholds[0]} - ${thresholds[1]}<br>`;
            div.innerHTML += `<i style="background:${colors[2]}"></i> > ${thresholds[1]}`;
            return div;
        };

        this.mapLegend = legend;
        legend.addTo(MapManager.map);
    },

    removeLegend() {
        if (this.mapLegend) {
            this.mapLegend.remove();
            this.mapLegend = null;
        }
    },

    reset() {
        this.removeLegend();
        this.dtConfigs = {};
        const container = document.getElementById('kpi-visual-controls');
        if (container) container.innerHTML = '<p class="placeholder-text">Run extraction to see KPI/DT controls...</p>';
    }
};