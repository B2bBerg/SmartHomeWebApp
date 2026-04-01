/**
 * overview.js – Dashboard tile grid management
 */

const GridManager = {
    MAX_COL: 6,
    MAX_ROW: 3,
    COLS: 6,
    dragSrc: null,
    editMode: false,
    hoveredGhost: null,
    activeSettingsTile: null,

    // Pending add-tile size selection
    addColSpan: 1,
    addRowSpan: 1,

    init() {
        this.container    = document.querySelector('.overview-container');
        this.modal        = document.getElementById('tile-modal');
        this.modalInput   = document.getElementById('tile-modal-input');
        this.settingsModal = document.getElementById('tile-settings-modal');

        this.setupEventListeners();

        // API: Load saved dashboard layout from DB on init
        // this.loadDashboard(await fetchDashboardLayout());

        this.refreshGhosts();
    },

    setupEventListeners() {
        // ── Edit mode ────────────────────────────────────────────────────────
        const editBtn = document.getElementById('edit-mode-btn');
        editBtn.addEventListener('click', () => {
            this.editMode = !this.editMode;
            editBtn.classList.toggle('active', this.editMode);
            this.container.classList.toggle('edit-mode', this.editMode);
            this.container.querySelectorAll('.dynamic-tile').forEach(t => t.draggable = this.editMode);
            editBtn.querySelector('img').src = this.editMode
                ? 'assets/icons/circle-exclamation-check-svgrepo-com.svg'
                : 'assets/icons/gear-svgrepo-com.svg';
            if (!this.editMode) this.saveDashboard();
            this.refreshGhosts();
        });

        // ── Add tile modal ───────────────────────────────────────────────────
        const addBtn = document.getElementById('add-tile-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addColSpan = 1;
                this.addRowSpan = 1;
                this.modalInput.value = '';
                this.updateAddSizeDisplay();
                this.modal.classList.remove('hidden');
                this.modalInput.focus();
            });
        }

        document.getElementById('tile-modal-confirm').onclick = () => this.addNewTile();
        document.getElementById('tile-modal-cancel').onclick  = () => this.modal.classList.add('hidden');

        // Add-modal size buttons
        document.getElementById('add-btn-col-plus').onclick  = () => { if (this.addColSpan < this.MAX_COL) { this.addColSpan++; this.updateAddSizeDisplay(); } };
        document.getElementById('add-btn-col-minus').onclick = () => { if (this.addColSpan > 1)           { this.addColSpan--; this.updateAddSizeDisplay(); } };
        document.getElementById('add-btn-row-plus').onclick  = () => { if (this.addRowSpan < this.MAX_ROW) { this.addRowSpan++; this.updateAddSizeDisplay(); } };
        document.getElementById('add-btn-row-minus').onclick = () => { if (this.addRowSpan > 1)           { this.addRowSpan--; this.updateAddSizeDisplay(); } };

        // ── Settings modal ───────────────────────────────────────────────────
        document.getElementById('tile-settings-close').onclick = () => {
            this.settingsModal.classList.add('hidden');
            this.activeSettingsTile = null;
            this.saveDashboard();
        };

        document.getElementById('tile-settings-delete').onclick = () => {
            if (!this.activeSettingsTile) return;
            this.activeSettingsTile.remove();
            this.settingsModal.classList.add('hidden');
            this.activeSettingsTile = null;
            this.refreshGhosts();
            this.saveDashboard();
        };

        // Settings size buttons (intuitive: +▶ wider, −◀ narrower, +▼ taller, −▲ shorter)
        document.getElementById('btn-col-plus').onclick  = () => this.resizeActiveTile('col-plus');
        document.getElementById('btn-col-minus').onclick = () => this.resizeActiveTile('col-minus');
        document.getElementById('btn-row-plus').onclick  = () => this.resizeActiveTile('row-plus');
        document.getElementById('btn-row-minus').onclick = () => this.resizeActiveTile('row-minus');

        // Live name update
        document.getElementById('settings-tile-label').oninput = (e) => {
            if (this.activeSettingsTile)
                this.activeSettingsTile.querySelector('.tile-label').textContent = e.target.value;
        };

        // API: On datapoint change – fetch available content types for this datapoint from DB
        // e.g. fetchContentTypes(datapoint).then(types => this.populateContentSelect(types))
        document.getElementById('settings-tile-datapoint').onchange = (e) => {
            if (!this.activeSettingsTile) return;
            this.activeSettingsTile.dataset.datapoint = e.target.value;
            this.filterContentByDatapoint(e.target.value);
            this.saveDashboard();
        };

        // API: On content type change – fetch initial data for this tile from DB
        // e.g. fetchTileData(datapoint, contentType).then(data => this.renderTileContent(tile, data))
        document.getElementById('settings-tile-content').onchange = (e) => {
            if (!this.activeSettingsTile) return;
            this.activeSettingsTile.dataset.contentType = e.target.value;
            this.renderTileContent(this.activeSettingsTile);
            this.saveDashboard();
        };

        // ── Drag & drop delegation ───────────────────────────────────────────
        this.container.addEventListener('dragover',  e => this.handleContainerDragOver(e));
        this.container.addEventListener('dragleave', e => this.handleContainerDragLeave(e));
        this.container.addEventListener('drop',      e => this.handleContainerDrop(e));
    },

    updateAddSizeDisplay() {
        document.getElementById('add-size-display').innerHTML = `${this.addColSpan} &times; ${this.addRowSpan}`;
        document.getElementById('add-btn-col-plus').disabled  = this.addColSpan >= this.MAX_COL;
        document.getElementById('add-btn-col-minus').disabled = this.addColSpan <= 1;
        document.getElementById('add-btn-row-plus').disabled  = this.addRowSpan >= this.MAX_ROW;
        document.getElementById('add-btn-row-minus').disabled = this.addRowSpan <= 1;
    },

    // ── DB interface ─────────────────────────────────────────────────────────

    getDashboardState() {
        return Array.from(this.container.querySelectorAll('.dynamic-tile')).map(tile => ({
            id:          tile.dataset.id,
            label:       tile.querySelector('.tile-label').textContent,
            col:         parseInt(tile.dataset.gridCol),
            row:         parseInt(tile.dataset.gridRow),
            colSpan:     parseInt(tile.dataset.colSpan),
            rowSpan:     parseInt(tile.dataset.rowSpan),
            contentType: tile.dataset.contentType || '',
            datapoint:   tile.dataset.datapoint   || ''
        }));
    },

    loadDashboard(jsonData) {
        this.container.querySelectorAll('.dynamic-tile').forEach(t => t.remove());
        if (Array.isArray(jsonData)) jsonData.forEach(config => this.addNewTile(config));
        this.refreshGhosts();
    },

    saveDashboard() {
        const state = this.getDashboardState();
        // API: Persist dashboard layout to DB
        // fetch('/api/dashboard', { method: 'POST', body: JSON.stringify(state) });
        console.log('Dashboard state:', JSON.stringify(state, null, 2));
        return state;
    },

    // ── Tile management ──────────────────────────────────────────────────────

    addNewTile(config = null) {
        const label = config ? config.label : this.modalInput.value.trim();
        if (!label) return;

        const tile = document.createElement('div');
        tile.className    = 'tile dynamic-tile';
        tile.dataset.id   = config ? config.id : `tile-${Date.now()}`;
        tile.innerHTML    = this.createTileHTML(label);

        if (config) {
            tile.dataset.gridCol = config.col;
            tile.dataset.gridRow = config.row;
            tile.dataset.colSpan = config.colSpan;
            tile.dataset.rowSpan = config.rowSpan;
            if (config.contentType) tile.dataset.contentType = config.contentType;
            if (config.datapoint)   tile.dataset.datapoint   = config.datapoint;
        } else {
            // Find first free position
            const occupied = this.getOccupied(null);
            let placed = false;
            for (let r = 1; r < 100 && !placed; r++) {
                for (let c = 1; c <= this.COLS - this.addColSpan + 1 && !placed; c++) {
                    let fits = true;
                    for (let dr = 0; dr < this.addRowSpan && fits; dr++)
                        for (let dc = 0; dc < this.addColSpan && fits; dc++)
                            if (occupied.has(`${r+dr},${c+dc}`)) fits = false;
                    if (fits) { tile.dataset.gridCol = c; tile.dataset.gridRow = r; placed = true; }
                }
            }
            tile.dataset.colSpan = this.addColSpan;
            tile.dataset.rowSpan = this.addRowSpan;
        }

        this.container.appendChild(tile);
        this.initTile(tile);
        if (config?.contentType) this.renderTileContent(tile);
        if (this.editMode) tile.draggable = true;

        this.modal.classList.add('hidden');
        this.refreshGhosts();
        this.saveDashboard();
    },

    initTile(tile) {
        tile.dataset.colSpan = tile.dataset.colSpan || 1;
        tile.dataset.rowSpan = tile.dataset.rowSpan || 1;

        tile.querySelector('.tile-edit-btn')?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.openSettings(tile);
        });

        tile.addEventListener('dragstart', (e) => {
            this.dragSrc = tile;
            setTimeout(() => tile.classList.add('dragging'), 0);
            e.dataTransfer.setData('text/plain', '');
        });
        tile.addEventListener('dragend', () => {
            tile.classList.remove('dragging');
            this.dragSrc = null;
            this.refreshGhosts();
        });
        tile.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); tile.classList.add('drag-over'); });
        tile.addEventListener('dragleave', () => tile.classList.remove('drag-over'));
        tile.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            tile.classList.remove('drag-over');
            if (!this.dragSrc || this.dragSrc === tile) return;
            const sameSize = this.dragSrc.dataset.colSpan === tile.dataset.colSpan &&
                             this.dragSrc.dataset.rowSpan === tile.dataset.rowSpan;
            if (!sameSize) { this.showError(tile, 'Tiles must be the same size to swap'); return; }
            const srcCol = this.dragSrc.dataset.gridCol, srcRow = this.dragSrc.dataset.gridRow;
            this.dragSrc.dataset.gridCol = tile.dataset.gridCol;
            this.dragSrc.dataset.gridRow = tile.dataset.gridRow;
            tile.dataset.gridCol = srcCol;
            tile.dataset.gridRow = srcRow;
            this.applyPosition(this.dragSrc);
            this.applyPosition(tile);
            this.refreshGhosts();
            this.saveDashboard();
        });

        this.applyPosition(tile);
    },

    openSettings(tile) {
        this.activeSettingsTile = tile;
        document.getElementById('settings-tile-label').value    = tile.querySelector('.tile-label').textContent;
        document.getElementById('settings-tile-datapoint').value = tile.dataset.datapoint || '';
        this.filterContentByDatapoint(tile.dataset.datapoint || '');
        document.getElementById('settings-tile-content').value  = tile.dataset.contentType || '';
        this.updateModalButtons();
        this.settingsModal.classList.remove('hidden');
    },

    // ── Content type registry ────────────────────────────────────────────────
    // API: Extend CONTENT_TYPES to add new tile renderers.
    // Each render() will later receive live data from fetchTileData(datapoint, type)
    CONTENT_TYPES: {
        'temp-current':   { render: () => `<div class="tile-value">-- °C</div>` },
        'temp-graph':     { render: () => `<div class="tile-graph-placeholder">📈 Temp Graph</div>` },
        'energy-current': { render: () => `<div class="tile-value">-- kWh</div>` },
        'energy-graph':   { render: () => `<div class="tile-graph-placeholder">📈 Energy Graph</div>` },
    },

    renderTileContent(tile) {
        tile.querySelector('.tile-content')?.remove();
        const type = tile.dataset.contentType;
        if (!type || !this.CONTENT_TYPES[type]) return;
        // API: Replace static render with live data:
        // fetchTileData(tile.dataset.datapoint, type).then(data => { div.innerHTML = ...; tile.appendChild(div); });
        const div = document.createElement('div');
        div.className = 'tile-content';
        div.innerHTML = this.CONTENT_TYPES[type].render();
        tile.appendChild(div);
    },

    // API: Populate datapoint dropdown from DB
    // fetchDatapoints().then(points => this.populateDatapointSelect(points))
    // populateDatapointSelect(points) {
    //     const sel = document.getElementById('settings-tile-datapoint');
    //     points.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.label; sel.appendChild(o); });
    // },

    // Maps datapoint prefixes to allowed content types – extend when adding new sensor types
    DATAPOINT_CONTENT_MAP: {
        'sensor.temp':   ['temp-current',   'temp-graph'],
        'sensor.energy': ['energy-current', 'energy-graph'],
    },

    filterContentByDatapoint(datapoint) {
        const select  = document.getElementById('settings-tile-content');
        const allowed = Object.entries(this.DATAPOINT_CONTENT_MAP)
            .filter(([prefix]) => datapoint.startsWith(prefix))
            .flatMap(([, types]) => types);
        [...select.options].forEach(opt => {
            opt.hidden = opt.value !== '' && allowed.length > 0 && !allowed.includes(opt.value);
        });
        if (allowed.length > 0 && !allowed.includes(select.value)) select.value = '';
    },

    resizeActiveTile(direction) {
        if (!this.activeSettingsTile) return;
        const t = this.activeSettingsTile;
        const c = +t.dataset.gridCol, r = +t.dataset.gridRow;
        const cs = +t.dataset.colSpan, rs = +t.dataset.rowSpan;

        if      (direction === 'col-plus'  && cs < this.MAX_COL && !this.isAreaOccupied(r, c + cs, rs, 1, t)) t.dataset.colSpan = cs + 1;
        else if (direction === 'col-minus' && cs > 1)                                                          t.dataset.colSpan = cs - 1;
        else if (direction === 'row-plus'  && rs < this.MAX_ROW && !this.isAreaOccupied(r + rs, c, 1, cs, t)) t.dataset.rowSpan = rs + 1;
        else if (direction === 'row-minus' && rs > 1)                                                          t.dataset.rowSpan = rs - 1;

        this.applyPosition(t);
        this.refreshGhosts();
        this.updateModalButtons();
    },

    updateModalButtons() {
        const t = this.activeSettingsTile;
        if (!t) return;
        const c = +t.dataset.gridCol, r = +t.dataset.gridRow;
        const cs = +t.dataset.colSpan, rs = +t.dataset.rowSpan;
        document.getElementById('btn-col-plus').disabled  = !(cs < this.MAX_COL && !this.isAreaOccupied(r, c + cs, rs, 1, t));
        document.getElementById('btn-col-minus').disabled = !(cs > 1);
        document.getElementById('btn-row-plus').disabled  = !(rs < this.MAX_ROW && !this.isAreaOccupied(r + rs, c, 1, cs, t));
        document.getElementById('btn-row-minus').disabled = !(rs > 1);
    },

    createTileHTML(label) {
        return `<span class="tile-label">${label}</span>
            <div class="tile-config-wrapper">
                <button class="tile-edit-btn" title="Configure"><img src="assets/icons/gear-svgrepo-com.svg"></button>
            </div>`;
    },

    applyPosition(el) {
        el.style.gridColumn = `${el.dataset.gridCol} / span ${el.dataset.colSpan}`;
        el.style.gridRow    = `${el.dataset.gridRow} / span ${el.dataset.rowSpan}`;
    },

    getOccupied(skipEl) {
        const occ = new Set();
        this.container.querySelectorAll('.dynamic-tile').forEach(el => {
            if (el === skipEl) return;
            const c = +el.dataset.gridCol, r = +el.dataset.gridRow;
            const cs = +el.dataset.colSpan, rs = +el.dataset.rowSpan;
            for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) occ.add(`${i},${j}`);
        });
        return occ;
    },

    isAreaOccupied(r, c, rs, cs, skip) {
        const occ = this.getOccupied(skip);
        for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) if (occ.has(`${i},${j}`)) return true;
        return false;
    },

    refreshGhosts() {
        this.container.querySelectorAll('.ghost-tile').forEach(g => g.remove());
        if (!this.editMode) return;
        let maxR = 1;
        this.container.querySelectorAll('.dynamic-tile').forEach(el =>
            maxR = Math.max(maxR, (+el.dataset.gridRow) + (+el.dataset.rowSpan)));
        maxR += 3;
        for (let r = 1; r <= maxR; r++) {
            for (let c = 1; c <= this.COLS; c++) {
                const g = document.createElement('div');
                g.className = 'ghost-tile';
                g.dataset.gridCol = c; g.dataset.gridRow = r;
                g.style.gridColumn = `${c} / span 1`; g.style.gridRow = `${r} / span 1`;
                this.container.appendChild(g);
            }
        }
    },

    handleContainerDragOver(e) {
        e.preventDefault();
        const g = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList.contains('ghost-tile'));
        if (g !== this.hoveredGhost) {
            if (this.hoveredGhost) this.hoveredGhost.classList.remove('drag-over');
            this.hoveredGhost = g || null;
            if (this.hoveredGhost) this.hoveredGhost.classList.add('drag-over');
        }
    },

    handleContainerDragLeave(e) {
        if (!this.container.contains(e.relatedTarget)) {
            if (this.hoveredGhost) { this.hoveredGhost.classList.remove('drag-over'); this.hoveredGhost = null; }
        }
    },

    handleContainerDrop(e) {
        e.preventDefault();
        const g = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList.contains('ghost-tile'));
        if (!this.dragSrc || !g) return;
        const c = +g.dataset.gridCol, r = +g.dataset.gridRow;
        const cs = +this.dragSrc.dataset.colSpan, rs = +this.dragSrc.dataset.rowSpan;
        if (c + cs - 1 <= this.COLS && !this.isAreaOccupied(r, c, rs, cs, this.dragSrc)) {
            this.dragSrc.dataset.gridCol = c;
            this.dragSrc.dataset.gridRow = r;
            this.applyPosition(this.dragSrc);
            this.saveDashboard();
        } else {
            this.showError(this.dragSrc, 'Tile does not fit here');
        }
        if (this.hoveredGhost) this.hoveredGhost.classList.remove('drag-over');
        this.hoveredGhost = null;
        this.refreshGhosts();
    },

    showError(target, msg) {
        const err = document.createElement('div');
        err.className = 'swap-error';
        err.textContent = msg;
        target.appendChild(err);
        setTimeout(() => err.remove(), 2000);
    }
};

document.addEventListener('DOMContentLoaded', () => GridManager.init());
