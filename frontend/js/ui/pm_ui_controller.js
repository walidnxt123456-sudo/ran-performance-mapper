// static/js/ui/pm_ui_controller.js

const PmUIController = {
    containerId: 'pm-tree-container',
    sectionId: 'pm-discovery-section',
    kpiCache: {}, // Stores data like: { "file|kpi": { "cell1": -95, "cell2": -105 } }
	lastDiscoveryData: null, // Store the full discovery JSON here
	lastSitesData: null,

	getDiscoveryCellIds() {
		if (!this.lastSitesData) return [];
		
		return this.lastSitesData.flatMap(site => 
        site.sectors.map(sector => sector.cell)
		);
	},
	
	_excelDateToString(serial) {
		const num = parseFloat(serial);  // handles "45992.0" and 45992 both
		if (isNaN(num)) return String(serial);  // fallback if not a number
		const date = new Date((num - 25569) * 86400 * 1000);
		if (isNaN(date.getTime())) return String(serial);  // fallback if invalid date
		return date.toISOString().split('T')[0];
	},

    renderDiscovery(files) {
		this.lastDiscoveryData = files; // Save the JSON received from backend
        const container = document.getElementById(this.containerId);
        const section = document.getElementById(this.sectionId);
		
		//------
		// Collect all unique columns across all files
		const allColumns = [...new Set(files.flatMap(f => f.all_columns || []))];
		const detectedDateCol = files[0]?.detected_date_col || null;
		const detectedHourCol = null; // no auto-detect for hour, user picks manually
		const detectedCellCol = null; // no auto-detect for cell, user picks manually

		const cellColSelect = document.getElementById('pm-cell-col-select');
		const dateColSelect = document.getElementById('pm-date-col-select');
		const hourColSelect = document.getElementById('pm-hour-col-select');

		cellColSelect.innerHTML = allColumns
			.map(col => `<option value="${col}">${col}</option>`)
			.join('');

		dateColSelect.innerHTML = allColumns
			.map(col => `<option value="${col}" ${col === detectedDateCol ? 'selected' : ''}>${col}</option>`)
			.join('');

		hourColSelect.innerHTML = allColumns
			.map(col => `<option value="${col}">${col}</option>`)
			.join('');


		//------
		
        if (!files || files.length === 0) return;
		
		// Collect all unique dates across all files and convert them
		const rawDates = [...new Set(files.flatMap(f => f.date_available || []))].sort();

		const dateRow = document.querySelector('#pm-discovery-section .input-row');
		dateRow.innerHTML = `
			<label>Date:</label>
			<select id="pm-date-select">
				${rawDates.map(d => `<option value="${d}">${d}</option>`).join('')}
			</select>
		`;

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

		if (checkbox.checked) {
			switcher.style.display = 'inline-flex';
		} else {
			switcher.style.display = 'none';
			// clear from cache if needed later
			const { file, kpi } = item.dataset;
			delete this.kpiCache[`${file}|${kpi}`];
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
    },
	
	async triggerExtraction() {
		// 1. Get Mandatory Date
		const dateValue = document.getElementById('pm-date-select').value;
		if (!dateValue) {
			alert("Target Date is mandatory.");
			return;
		}

		// 2. Get Selected KPIs (from your existing checkboxes)
		const selected = Array.from(document.querySelectorAll('.kpi-item input:checked'))
			.map(input => ({
				file: input.closest('.kpi-item').dataset.file,
				kpi: input.closest('.kpi-item').dataset.kpi
			}));

		if (selected.length === 0) {
			alert("Please select at least one KPI.");
			return;
		}

		// 3. Get Cell IDs from the Discovery JSON (as requested)
		const cellList = this.getDiscoveryCellIds();

		const payload = {
			mode: "extraction",
			target_date: [String(dateValue)],
			extraction_mode: document.getElementById('pm-agg-mode').value === 'busy_hour' ? 'bh' : 'avg',
			cell_identity_column: document.getElementById('pm-cell-col-select').value,
			date_identity_column: document.getElementById('pm-date-col-select').value,
			hour_identity_column: document.getElementById('pm-hour-col-select').value,
			cells: cellList,
			kpi_selection: selected
		};

		console.log("[PM_UI] Bulk Extraction Payload:", payload);
		return await ApiService.post('/api/fetch-kpi', payload);
	}
};