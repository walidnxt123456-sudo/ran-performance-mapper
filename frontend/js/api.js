// frontend/js/api.js

const ApiService = {
    // Verbose Mode Toggle
    isVerbose: true,

    async post(endpoint, data) {
        if (this.isVerbose) {
            console.log(`%c[VERBOSE] Sending to ${endpoint}:`, "color: #3498db; font-weight: bold;", data);
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
				const errorBody = await response.text();
				console.error('[API ERROR] Server response body:', errorBody);
				throw new Error(`Server Error: ${response.status}`);
            }

            const result = await response.json();

            if (this.isVerbose) {
                console.log(`%c[VERBOSE] Received from ${endpoint}:`, "color: #27ae60; font-weight: bold;", result);
            }

            return result;
        } catch (error) {
            console.error(`%c[API ERROR] ${error.message}`, "color: #e74c3c; font-weight: bold;");
            return { success: false, message: error.message };
        }
    },

    /**
     * Récupère la configuration globale et les Feature Flags.
     */
    async fetchAppConfig() {
        try {
            const response = await fetch('/api/v1/config');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const config = await response.json();
            console.log('[CONFIG] Configuration système chargée :', config);
            return config;
        } catch (error) {
            console.error('[CONFIG] Échec du chargement de la configuration :', error);
            return {
                profile: "level2",
                features: {
                    show_raw_counters: true,
                    enable_advanced_rca: true,
                    enable_kpi_formula_editor: true,
                    show_technical_layers: true,
                    allowed_kpi_types: ["all"],
                    export_formats: ["csv", "json", "excel_raw"],
                    dashboard_type: "advanced_analytics"
                }
            };
        }
    },
    /**
     * Récupère l'arborescence des bases de cellules (2G, 3G, 4G, 5G).
     */
    async fetchCellHierarchy() {
        try {
            const response = await fetch('/api/v1/config/cell-hierarchy');
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[HIERARCHY] Échec du chargement :', error);
            return null;
        }
    }
};

