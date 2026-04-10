// static/js/ui/pm_ui_controller.js

const PmUIController = {
    containerId: 'pm-tree-container',
    sectionId: 'pm-discovery-section',
    kpiCache: {}, // Stores data like: { "file|kpi": { "cell1": -95, "cell2": -105 } }

    renderDiscovery(files) {
        const container = document.getElementById(this.containerId);
        const section = document.getElementById(this.sectionId);
        if (!files || files.length === 0) return;

        section.style.display = 'block';
        container.innerHTML = files.map(file => this._buildFileHtml(file)).join('');
    },

    _buildFileHtml(file) {
        return `
            <div class="pm-file-group">
                <div class="pm-file-header" onclick="PmUIController.toggleFolder(this)">
                    <span class="toggle-icon">[+]</span> 📄 ${file.file_name}
                </div>
                <ul class="pm-kpi-list" style="display: none;">
                    ${file.kpis.map(kpi => `
                        <li class="kpi-item" data-file="${file.file_name}" data-kpi="${kpi}">
                            <div class="kpi-row">
                                <label class="kpi-label">
                                    <input type="checkbox" onchange="PmUIController.handleToggle(this)">
                                    ${kpi}
                                </label>
                                <div class="vis-switcher" style="display: none;">
                                    <span class="vis-opt" onclick="PmUIController.setMode('${file.file_name}', '${kpi}', 1)">(M1)</span>
                                    <span class="vis-opt" onclick="PmUIController.setMode('${file.file_name}', '${kpi}', 2)">(M2)</span>
                                    <span class="vis-opt" onclick="PmUIController.setMode('${file.file_name}', '${kpi}', 3)">(M3)</span>
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    },

	async handleToggle(checkbox) {
		const item = checkbox.closest('.kpi-item');
		const switcher = item.querySelector('.vis-switcher');
		const { file, kpi } = item.dataset;
		const cacheKey = `${file}|${kpi}`;

		if (checkbox.checked) {
			// 1. Check the map for cells
			const cellList = SiteLayer.getCurrentCellIds(); 
			
			if (cellList.length === 0) {
				alert("Please apply a selection to the map first.");
				checkbox.checked = false;
				return;
			}

			// 2. Fetch if not in cache
			if (!this.kpiCache[cacheKey]) {
				console.log(`[PM_UI] Fetching Mode B for ${kpi}`);
				const response = await ApiService.post('/api/fetch-kpi', {
					file_name: file,
					kpi_name: kpi,
					cells: cellList
				});

				if (response.success) {
					this.kpiCache[cacheKey] = response.values;
					switcher.style.display = 'inline-flex';
				} else {
					alert("Failed to fetch KPI data.");
					checkbox.checked = false;
				}
			} else {
				switcher.style.display = 'inline-flex';
			}
		} else {
			switcher.style.display = 'none';
			// Logic for clearing visualization goes here later
		}
	},

    setMode(file, kpi, mode) {
        const data = this.kpiCache[`${file}|${kpi}`];
        console.log(`Visualizing ${kpi} using Mode ${mode}`, data);
        // This will call the future Visualization Engine
    },

    toggleFolder(el) {
        const list = el.nextElementSibling;
        const icon = el.querySelector('.toggle-icon');
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'block' : 'none';
        icon.innerText = isHidden ? '[-]' : '[+]';
    }
};