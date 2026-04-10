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
    }
};