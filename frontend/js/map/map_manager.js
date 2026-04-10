// frontend/js/map/map_manager.js

/**
 * CORE MAP MANAGER
 * Responsibility: Initialize the map and manage the lifecycle of data layers.
 * Pattern: Registry Pattern for extensible Layer Management.
 */
const MapManager = {
    map: null,
    selectionMarker: null,
    
    // The Registry holds the actual Leaflet Layer Groups
    registry: {
        '4G': L.featureGroup(),
        '5G': L.featureGroup(),
        'PM': L.featureGroup(),
        'CM': L.featureGroup(),
        'UI': L.featureGroup() // For selection markers/temp lines
    },

    isVerbose: true,

    init(lat = 35.8308, lon = 10.6303) {
        this._log("Initializing Map Engine...");
		if (L.DomUtil.get('map')._leaflet_id) {
			L.DomUtil.get('map')._leaflet_id = null;
		}

		if (this.map) {
			this._log("Map already exists. Skipping initialization.");
			return;
		}

		// Check if the DOM element exists
		const mapDiv = document.getElementById('map');
		if (!mapDiv) {
			console.error("Critical Error: 'map' div not found in HTML.");
			return;
		}

        this.map = L.map('map').setView([lat, lon], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.map);

        // Add all registered layers to the map immediately
        Object.values(this.registry).forEach(layer => layer.addTo(this.map));

        this._setupEvents();
    },

    _setupEvents() {
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.updateUserSelection(lat, lng);
            
            // Sync with UI inputs
            document.getElementById('lat').value = lat.toFixed(6);
            document.getElementById('lon').value = lng.toFixed(6);
        });
    },

    /**
     * Updates the physical red marker for user selection
     */
    updateUserSelection(lat, lon) {
        this.registry['UI'].clearLayers();
        
        this.selectionMarker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(this.registry['UI']);

        this._log(`Selection updated to: ${lat}, ${lon}`);
    },

    /**
     * Toggles visibility of a specific data type
     */
    setLayerVisibility(tech, isVisible) {
        const layer = this.registry[tech.toUpperCase()];
        if (!layer) return;

        if (isVisible) {
            this.map.addLayer(layer);
        } else {
            this.map.removeLayer(layer);
        }
        this._log(`Layer ${tech} visibility set to: ${isVisible}`);
    },

    /**
     * Clears specific or all data layers
     */
    clearDataLayers(tech = null) {
        if (tech) {
            this.registry[tech.toUpperCase()]?.clearLayers();
        } else {
            // Clear all except UI
            ['4G', '5G', 'PM', 'CM'].forEach(t => this.registry[t].clearLayers());
        }
    },

    _log(msg) {
        if (this.isVerbose) console.log(`%c[MAP_MANAGER] ${msg}`, "color: #9b59b6; font-weight: bold;");
    }
};

document.addEventListener('DOMContentLoaded', () => MapManager.init());