//non_radio_layer.js
const NonRadioLayer = {
    render(items) {
        items.forEach(item => {
            // Exemple : Affichage sous forme de marqueur circulaire simple ou d'icône fixe
            const marker = L.circleMarker([item.lat, item.lon], {
                radius: 6,
                color: '#e74c3c',
                fillColor: '#f1c40f',
                fillOpacity: 0.8,
                weight: 1,
                siteId: item.site_id
            });

            const tooltipContent = `
                <div><b>MSAN / Non-Radio:</b> ${item.name || item.site_id}</div>
                <div>Type: ${item.type || 'Fixe'}</div>
            `;
            marker.bindTooltip(tooltipContent);

            // Ajout au groupe dédié dans MapManager
            MapManager.registry['MSAN'].addLayer(marker);
        });
    }
};
