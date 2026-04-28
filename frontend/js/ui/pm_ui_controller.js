// static/js/ui/pm_ui_controller.js

const PmUIController = {
    containerId: 'pm-tree-container',
    sectionId: 'pm-discovery-section',
    lastDiscoveryData: null,
    lastSitesData: null,

    getDiscoveryCellIds() {
        if (!this.lastSitesData) return [];
        return this.lastSitesData.flatMap(site =>
            site.sectors.map(sector => sector.cell)
        );
    },

    _safeId(fileName) {
        return fileName.replace(/[^a-z0-9]/gi, '_');
    },

    renderDiscovery(files) {
        this.lastDiscoveryData = files;
        const container = document.getElementById(this.containerId);
        const section = document.getElementById(this.sectionId);
        if (!files || files.length === 0) return;
        section.style.display = 'block';
        container.innerHTML = files.map(file => this._buildFileHtml(file)).join('');
    },

	_buildFileHtml(file) {
		const sid = this._safeId(file.file_name);
		const column_avai = file.column_list || [];
		const date_av = file.date_available || [];

		// 1. Create options for the specific DATES found in the file (e.g., "13/04/2026")
		const dateOptions = date_av.map(d => `<option value="${d}">${d}</option>`).join('');
		const dateOptionsNone = `<option value="">(none)</option>` + dateOptions;

		// 2. Create options for the COLUMN names (e.g., "EUtranCell Id")
		const colOptions = column_avai.map(col => `<option value="${col}">${col}</option>`).join('');
		const colOptionsNone = `<option value="">(none)</option>` + colOptions;

		// 3. Create clickable badges (Fixing the variable names here)
		const kpiBadges = column_avai.map(item =>
			`<span class="kpi-badge" onclick="PmUIController.assignKpi('${sid}', '${item}')" title="Click to assign">${item}</span>`
		).join('');

		return `
		<div class="pm-file-group" data-file-path="${file.file_path || file.file_name}" data-sid="${sid}">
			<div class="pm-file-header" onclick="PmUIController.toggleFolder(this)">
				<span class="toggle-icon">[+]</span> 📄 ${file.file_name}
			</div>
			
			<div class="pm-file-body" style="display:none; padding: 10px;">
				
				<div class="input-row">
					<label>Aggregation:</label>
					<select id="pm-agg-${sid}">
						<option value="bh">Busy Hour</option>
						<option value="avg">Average</option>
					</select>
				</div>

				<div class="input-row">
					<label>Target Date:</label>
					<select id="pm-date-val-${sid}">
						${dateOptionsNone}
					</select>
				</div>

				<div class="input-row">
					<label>Date Column:</label>
					<select id="pm-date-col-${sid}">
						${colOptionsNone}
					</select>
				</div>

				<div class="input-row">
					<label>Cell Column:</label>
					<select id="pm-cell-col-${sid}">
						${colOptionsNone}
					</select>
				</div>

				<div class="input-row">
					<label>Hour Column:</label>
					<select id="pm-hour-col-${sid}">
						${colOptionsNone}
					</select>
				</div>


				<div class="input-row">
					<label>KPI 1:</label>
					<select id="pm-kpi1-${sid}">${colOptionsNone}</select>
				</div>
				<div class="input-row">
					<label>KPI 2:</label>
					<select id="pm-kpi2-${sid}">${colOptionsNone}</select>
				</div>
			</div>
		</div>`;
	},



    // Clicking a badge fills the first empty KPI slot (1 → 2 → 3)
    assignKpi(sid, kpi) {
        for (let i = 1; i <= 3; i++) {
            const sel = document.getElementById(`pm-kpi${i}-${sid}`);
            if (sel && sel.value === '') {
                sel.value = kpi;
                return;
            }
        }
        // All slots filled — overwrite slot 3
        const sel = document.getElementById(`pm-kpi3-${sid}`);
        if (sel) sel.value = kpi;
    },

    toggleFolder(el) {
        const body = el.nextElementSibling;
        const icon = el.querySelector('.toggle-icon');
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        icon.innerText = isHidden ? '[-]' : '[+]';
    },

    _buildPayload(group) {
        const sid = group.dataset.sid;
        const filePath = group.dataset.filePath;

        const dateValue      = document.getElementById(`pm-date-val-${sid}`)?.value || '';
        const extractionMode = document.getElementById(`pm-agg-${sid}`)?.value || 'avg';
        const cellCol        = document.getElementById(`pm-cell-col-${sid}`)?.value || '';
        const dateCol        = document.getElementById(`pm-date-col-${sid}`)?.value || '';
        const hourColRaw     = document.getElementById(`pm-hour-col-${sid}`)?.value || '';
        const hourCol        = hourColRaw === '' ? null : hourColRaw;

        const kpiCols = [
            document.getElementById(`pm-kpi1-${sid}`)?.value,
            document.getElementById(`pm-kpi2-${sid}`)?.value,
            document.getElementById(`pm-kpi3-${sid}`)?.value,
        ].filter(v => v && v !== '');

        if (!cellCol || !dateCol || kpiCols.length === 0) return null;

        return {
            mode: "extraction",
            file_path: filePath,
            cell_identity_column: cellCol,
            date_identity_column: dateCol,
            hour_identity_column: hourCol,
            extraction_mode: extractionMode,
			target_kpi: kpiCols,
            target_date: dateValue ? [String(dateValue)] : [],
            target_cells: this.getDiscoveryCellIds()
        };
    },

	async triggerExtraction() {
		const groups = document.querySelectorAll('.pm-file-group');
		const taskList = [];

		// 1. Gather all the individual file settings
		groups.forEach(group => {
			const task = this._buildPayload(group);
			if (task) {
				// Clean up the task: remove 'mode' if it was added in _buildPayload
				// so it strictly matches the ExtractionTask schema
				delete task.mode; 
				taskList.push(task); 
			}
		});

		if (taskList.length === 0) {
			alert("Please configure at least one file (select Cell, Date, and KPIs).");
			return;
		}

		// 2. Wrap them into the BatchExtractionRequest
		const finalRequest = {
			mode: "extraction",
			tasks: taskList 
		};

		console.log("[PM_UI] Sending Batch Request to Backend:", finalRequest);

		// 3. Send and handle the response
		try {
			const response = await ApiService.post('/api/fetch-kpi', finalRequest);
			
			if (response.success) {
				console.log("Extraction successful!", response.results_by_file);
				return response; // Return the actual data
			} else {
				console.error("Backend error:", response.message);
				alert("Extraction failed: " + response.message);
			}
		} catch (err) {
			console.error("Network or System error:", err);
		}
	}
};