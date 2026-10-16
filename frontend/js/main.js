//static/js/main.js
/**
 * MAIN ENTRY POINT
 * Role: Bootstraps the app and links UI events to Controllers/Managers.
 */
document.addEventListener('DOMContentLoaded', async() => {
    console.log("%c[SYSTEM] Application Bootstrapping...", "color: #2ecc71; font-weight: bold;");
    // Charger la configuration dynamique backend
    window.APP_CONFIG = await ApiService.fetchAppConfig();
    console.log(`[INIT] Mode actif : ${window.APP_CONFIG.profile.toUpperCase()}`);

    // 1. Initialize the Map Engine
    // Default center (e.g., Tunis) - MapManager handles its own registry
    MapManager.init(36.806, 10.181);

    // 2. Bind the "Apply Selection" Button
    const applyBtn = document.getElementById('btn-apply');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            console.log("[SYSTEM] Apply triggered.");
            UIController.handleApply();
        });
    }

    // 3. Bind the Technology Toggles (Show/Hide Logic)
    // This allows instant visibility switching without re-fetching data
    ['2G','3G','4G', '5G'].forEach(tech => {
        const checkbox = document.getElementById(`check-${tech.toLowerCase()}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                MapManager.setLayerVisibility(tech, e.target.checked);
            });
        }
    });

    try {
        const hierarchyData = await ApiService.fetchCellHierarchy();
        if (hierarchyData) {
            const container = document.getElementById('cell-hierarchy-tree');
            if (container) {
                let html = '<ul style="list-style: none; padding-left: 0; margin: 0;">';
                
                Object.keys(hierarchyData).forEach((techKey, idx) => {
                    const techData = hierarchyData[techKey];
                    const techId = techKey.toLowerCase(); // ex: "4g", "5g"
                    
                    html += `
                    <li style="margin-bottom: 6px;">
                        <label style="font-weight: bold; cursor: pointer;">
                            <input type="checkbox" class="tree-tech-checkbox" data-tech="${techKey}" checked> 
                            📂 0${idx + 1} - ${techKey} Sites (${techData.sites.length})
                        </label>
                        <ul style="list-style: none; padding-left: 18px; margin-top: 4px; font-size: 0.95em; color: #555;">
                            <li>├── 01 - Sites (${techData.sites.length} items)</li>
                            <li>├── 02 - Sites Name</li>
                            <li>└── 03 - CELL (${techData.cells.length} items)</li>
                        </ul>
                    </li>`;
                });
                
                html += '</ul>';
                container.innerHTML = html;

                // Lier les checkboxes aux calques MapManager existants
                document.querySelectorAll('.tree-tech-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const tech = e.target.getAttribute('data-tech');
                        const isChecked = e.target.checked;
                        
                        // Utilise la fonction existante de MapManager pour afficher/masquer
                        if (typeof MapManager.setLayerVisibility === 'function') {
                            MapManager.setLayerVisibility(tech, isChecked);
                        }
                    });
                });
            }
        }
    } catch (err) {
        console.error("[INIT] Erreur chargement arborescence interactive :", err);
    }

	
	//4.pm extraction
	const pm_extraction_Btn = document.getElementById('btn-pm-extraction');
	if (pm_extraction_Btn) {
		pm_extraction_Btn.addEventListener('click', () => PmUIController.triggerExtraction());
	}
	
	// 5. Bind Map Visualization Buttons
	const applyThematicBtn = document.getElementById('btn-update-thematic');
	if (applyThematicBtn) {
		applyThematicBtn.addEventListener('click', () => {
			KPIVisualManager.applyThematic();
		});
	}

	const resetThematicBtn = document.getElementById('btn-reset-thematic');
	if (resetThematicBtn) {
		resetThematicBtn.addEventListener('click', () => {
			KPIVisualManager.resetMap();
		});
	}

    // Bind Drive Test Scan Button
    const dtScanBtn = document.getElementById('btn-dt-scan');
    if (dtScanBtn) {
        dtScanBtn.addEventListener('click', () => DtUIController.triggerScan());
    }

    console.log("%c[SYSTEM] All modules linked and ready.", "color: #2ecc71;");
});