//static/js/main.js
/**
 * MAIN ENTRY POINT
 * Role: Bootstraps the app and links UI events to Controllers/Managers.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("%c[SYSTEM] Application Bootstrapping...", "color: #2ecc71; font-weight: bold;");

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
    ['4G', '5G'].forEach(tech => {
        const checkbox = document.getElementById(`check-${tech.toLowerCase()}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                MapManager.setLayerVisibility(tech, e.target.checked);
            });
        }
    });

    console.log("%c[SYSTEM] All modules linked and ready.", "color: #2ecc71;");
});