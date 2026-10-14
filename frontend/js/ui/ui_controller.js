// frontend/js/ui/ui_controller.js

const UIController = {
    // 1. You must include this helper function to read the sidebar inputs
    getSelectionData() {
        const selectedTechs = [];
        
        // Vérification sécurisée des checkboxes si elles existent encore
        const checkboxes = document.querySelectorAll('.tree-tech-checkbox:checked');
        if (checkboxes.length > 0) {
            checkboxes.forEach(cb => {
                selectedTechs.push(cb.getAttribute('data-tech'));
            });
        } else {
            // Valeur de secours par défaut incluant toutes les technologies
            selectedTechs.push("2G", "3G", "4G", "5G");
        }

        // Par défaut, si aucune case n'est trouvée (ou si vous utilisez l'arborescence), 
        // vous pouvez adapter ou renvoyer un tableau par défaut (ex: ["4G", "5G"])
        if (selectedTechs.length === 0) {
            selectedTechs.push("4G", "5G"); // Valeur de secours pour la requête de découverte
        }

        return {
            center: {
                lat: parseFloat(document.getElementById('lat').value),
                lon: parseFloat(document.getElementById('lon').value)
            },
            technologies: selectedTechs,
            limit: parseInt(document.getElementById('site-limit').value)
        };
    },

    // 2. Add the 'async' method correctly inside the object
    async handleApply() {
        const payload = this.getSelectionData(); 
        
        MapManager.clearDataLayers();
		
		// Call existing API endpoint
        const response = await ApiService.post('/api/find-nearest', payload);

		if (response.success) {
			// 1. Render physical sites
			if (response.sites) {
				SiteLayer.render(response.sites);
			}

			// 2. Render PM Discovery (Mode A)
			if (response.pm_discovery) {
				PmUIController.renderDiscovery(response.pm_discovery);
				PmUIController.lastSitesData = response.sites;
			}

			MapManager.map.flyTo([payload.center.lat, payload.center.lon], 15);
		} else {
			console.error("Discovery failed:", response.message);
		}
    }
}; // Don't forget the closing brace!