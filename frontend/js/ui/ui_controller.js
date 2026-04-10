// frontend/js/ui/ui_controller.js

const UIController = {
    // 1. You must include this helper function to read the sidebar inputs
    getSelectionData() {
        const selectedTechs = [];
        if (document.getElementById('check-4g').checked) selectedTechs.push("4G");
        if (document.getElementById('check-5g').checked) selectedTechs.push("5G");

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
			}

			MapManager.map.flyTo([payload.center.lat, payload.center.lon], 15);
		} else {
			console.error("Discovery failed:", response.message);
		}
    }
}; // Don't forget the closing brace!