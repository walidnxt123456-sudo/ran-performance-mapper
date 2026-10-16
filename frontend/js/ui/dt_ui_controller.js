// frontend/js/ui/dt_ui_controller.js

const DtUIController = {
    allFilesData: [],

    async triggerScan() {
        console.log("[DT_UI] Scanning Drive Test files...");
        try {
            const response = await ApiService.post('/api/drive-test/scan', {});
            
            if (response.success && response.drive_test_discovery) {
                this.allFilesData = response.drive_test_discovery;
                this.renderFilesDropdown(this.allFilesData);
            } else {
                alert("Aucun fichier Drive Test trouvé dans ./data/dt.");
            }
        } catch (err) {
            console.error("[DT_UI] Erreur lors du scan Drive Test:", err);
        }
    },

    renderFilesDropdown(files) {
        const select = document.getElementById('dt-file-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Sélectionnez un fichier DT --</option>';
        
        files.forEach(file => {
            const opt = document.createElement('option');
            opt.value = file.file_name;
            opt.textContent = `${file.file_name} (${file.detected_technology} - ${file.valid_gps_points} pts)`;
            select.appendChild(opt);
        });

        select.style.display = 'block';

        // Changement de fichier -> affichage du panneau de configuration
        select.onchange = (e) => {
            const fileName = e.target.value;
            const configPanel = document.getElementById('dt-config-panel');
            
            if (!fileName) {
                configPanel.style.display = 'none';
                return;
            }

            const selectedFileMeta = files.find(f => f.file_name === fileName);
            if (selectedFileMeta && selectedFileMeta.columns) {
                this.renderMetricsCheckboxes(selectedFileMeta.columns, selectedFileMeta.detected_technology);
                configPanel.style.display = 'block';
            }
        };

        // Liaison explicite du bouton "Afficher / Extraire DT"
        const extractBtn = document.getElementById('btn-dt-extract');
        if (extractBtn) {
            // Utilisation de .onclick pour éviter les double-bindings
            extractBtn.onclick = () => {
                console.log("[DT_UI] Bouton Extraire cliqué !");
                this.triggerExtraction();
            };
        }
    },

    renderMetricsCheckboxes(columns, technology) {
        const container = document.getElementById('dt-metrics-container');
        if (!container) return;

        container.innerHTML = '';

        // Exclure les colonnes obligatoires de la liste des métriques optionnelles à cocher
        const excludedCols = ['Latitude', 'Longitude', 'Time', 'lat', 'lon', 'time'];
        
        columns.forEach(col => {
            if (excludedCols.includes(col)) return;

            const div = document.createElement('div');
            div.style.marginBottom = '4px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = col;
            checkbox.id = `dt-metric-${col.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            // Pré-cocher par défaut si c'est du RSRP ou RSCP
            if (
                (technology === '4G' && col.includes('RSRP')) ||
                (technology === '3G' && col.includes('RSCP')) ||
                (technology === '5G' && col.includes('RSRP'))
            ) {
                checkbox.checked = true;
            }

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = ` ${col}`;
            label.style.marginLeft = '6px';
            label.style.fontSize = '0.9em';

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    },

    async triggerExtraction() {
        const select = document.getElementById('dt-file-select');
        const fileName = select ? select.value : null;

        if (!fileName) {
            alert("Veuillez sélectionner un fichier Drive Test.");
            return;
        }

        const checkedMetrics = Array.from(document.querySelectorAll('#dt-metrics-container input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        if (checkedMetrics.length === 0) {
            alert("Veuillez cocher au moins une métrique à analyser.");
            return;
        }

        console.log(`[DT_UI] Chargement de ${fileName} pour analyse visuelle...`);
        try {
            const response = await ApiService.post('/api/drive-test/data', { file_name: fileName });
            if (response.success) {
                // Initialiser le gestionnaire de la barre de droite avec les données et les métriques cochées
                DriveTestVisualManager.init(response.data, checkedMetrics);
                
                // Afficher les points de base sur la carte
                if (MapManager.driveTestLayer) {
                    MapManager.driveTestLayer.renderPoints(response.data, response.detected_technology, checkedMetrics);
                }
            } else {
                alert("Erreur: " + response.message);
            }
        } catch (err) {
            console.error("[DT_UI] Erreur réseau:", err);
        }
    }
};