class DriveTestLayer {
    constructor(map) {
        this.map = map;
        this.layerGroup = L.layerGroup().addTo(map);
    }

    async loadAndDisplayFile(fileName, selectedMetrics = []) {
        try {
            console.log(`[DRIVE_TEST_LAYER] Envoi requête POST /api/drive-test/data pour ${fileName}`);
            const response = await fetch('/api/drive-test/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: fileName })
            });
            
            const result = await response.json();
            console.log("[DRIVE_TEST_LAYER] Réponse reçue du backend :", result);
            
            if (!result.success) {
                console.error("Erreur lors du chargement des données Drive Test:", result.message);
                return;
            }

            this.renderPoints(result.data, result.detected_technology, selectedMetrics);
        } catch (error) {
            console.error("Erreur réseau lors de la récupération du fichier Drive Test:", error);
        }
    }

    renderPoints(dataPoints, technology, selectedMetrics) {
        this.layerGroup.clearLayers();

        dataPoints.forEach(pt => {
            // Lat, Lon, Time toujours obligatoires
            const lat = parseFloat(pt.Latitude || pt.lat);
            const lon = parseFloat(pt.Longitude || pt.lon);
            const timeVal = pt.Time || pt.time || 'N/A';

            if (isNaN(lat) || isNaN(lon)) return;

            let color = '#3388ff';
            let primarySignal = null;

            // Déterminer une couleur principale basée sur la première métrique sélectionnée ou par défaut
            if (selectedMetrics && selectedMetrics.length > 0) {
                const firstMetric = selectedMetrics[0];
                primarySignal = parseFloat(pt[firstMetric]);
                color = this.getMetricColor(firstMetric, primarySignal);
            } else {
                // Fallback techno
                if (technology === '4G' && pt['RSRP (LTE pcell)'] !== undefined) {
                    primarySignal = parseFloat(pt['RSRP (LTE pcell)']);
                    color = this.getRsrpColor(primarySignal);
                }
            }

            // Construction dynamique de la Popup avec toutes les métriques demandées
            let metricsHtml = '';
            if (selectedMetrics && selectedMetrics.length > 0) {
                selectedMetrics.forEach(m => {
                    metricsHtml += `<b>${m} :</b> ${pt[m] !== undefined ? pt[m] : 'N/A'}<br>`;
                });
            } else {
                metricsHtml = `<b>Packet Tech :</b> ${pt['Packet technology'] || 'N/A'}<br>`;
            }

            const marker = L.circleMarker([lat, lon], {
                radius: 4,
                fillColor: color,
                color: '#000',
                weight: 0.5,
                opacity: 0.8,
                fillOpacity: 0.9
            });

            marker.bindPopup(`
                <b>Technologie :</b> ${technology}<br>
                <b>Heure :</b> ${timeVal}<br>
                ${metricsHtml}
                <b>Coordonnées :</b> ${lat.toFixed(5)}, ${lon.toFixed(5)}
            `);

            this.layerGroup.addLayer(marker);
        });
    }

    renderThematicPoints(dataPoints, metricName, config) {
        this.layerGroup.clearLayers();

        dataPoints.forEach(pt => {
            const lat = parseFloat(pt.Latitude || pt.lat);
            const lon = parseFloat(pt.Longitude || pt.lon);
            const timeVal = pt.Time || pt.time || 'N/A';

            if (isNaN(lat) || isNaN(lon)) return;

            const val = parseFloat(pt[metricName]);
            let color = '#999999';

            if (!isNaN(val) && config) {
                if (val < config.thresholds[0]) color = config.colors[0];
                else if (val < config.thresholds[1]) color = config.colors[1];
                else color = config.colors[2];
            }

            const marker = L.circleMarker([lat, lon], {
                radius: 4,
                fillColor: color,
                color: '#000',
                weight: 0.5,
                opacity: 0.8,
                fillOpacity: 0.9
            });

            let popupContent = `
                <b>Heure :</b> ${timeVal}<br>
                <b>${metricName} :</b> ${!isNaN(val) ? val : 'N/A'}<br>
                <b>Coordonnées :</b> ${lat.toFixed(5)}, ${lon.toFixed(5)}
            `;

            if (config && config.showLabels && !isNaN(val)) {
                marker.bindTooltip(`${val}`, {permanent: true, direction: 'top'}).openTooltip();
            }

            marker.bindPopup(popupContent);
            this.layerGroup.addLayer(marker);
        });
    }

    getMetricColor(metricName, val) {
        if (isNaN(val)) return '#999999';
        const nameLower = metricName.toLowerCase();
        
        if (nameLower.includes('rsrp')) {
            if (val >= -85) return '#2ecc71';
            if (val >= -100) return '#f1c40f';
            return '#e74c3c';
        }
        if (nameLower.includes('rscp') || nameLower.includes('level')) {
            if (val >= -80) return '#2ecc71';
            if (val >= -95) return '#f1c40f';
            return '#e74c3c';
        }
        return '#3388ff';
    }

    getRsrpColor(rsrp) {
        if (isNaN(rsrp)) return '#999999';
        if (rsrp >= -85) return '#2ecc71';
        if (rsrp >= -100) return '#f1c40f';
        return '#e74c3c';
    }

    clear() {
        this.layerGroup.clearLayers();
    }
}