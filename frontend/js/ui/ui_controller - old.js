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

        const response = await ApiService.post('/api/find-nearest', payload);

        if (response.success && response.sites) {
            SiteLayer.render(response.sites);
            MapManager.map.flyTo([payload.center.lat, payload.center.lon], 15);
        } else {
            alert("Discovery failed: " + (response.message || "Unknown error"));
        }
    }
}; // Don't forget the closing brace!