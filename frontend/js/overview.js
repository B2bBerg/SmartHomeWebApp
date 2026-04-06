/**
 * overview.js – Dashboard tile grid management
 */

const GridManager = {
    MAX_COL: 3,
    MAX_ROW: 3,
    COLS: 6,
    dragSrc: null,
    resizeSrc: null,
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

        // Dropdowns dynamisch aus derselben Datenquelle laden wie die Tabellen
        this.populateDatapoints().then(() => {
            // API: Load saved dashboard layout from DB on init
            window.API.getDashboard().then(data => {
                if (data && data.length > 0) this.loadDashboard(data);
            }).catch(err => console.error("Dashboard Ladefehler:", err));
        });

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
                
                const addDp = document.getElementById('add-tile-datapoint');
                const addCt = document.getElementById('add-tile-content');
                if (addDp) addDp.value = '';
                if (addCt) addCt.value = '';
                this.filterContentByDatapoint('', 'add-tile-content');
                
                this.updateAddSizeDisplay();
                this.modal.classList.remove('hidden');
                this.modalInput.focus();
            });
        }

        document.getElementById('tile-modal-confirm').onclick = () => {
            if (!this.modalInput.value.trim()) { this.modalInput.focus(); return; }
            this.addNewTile();
        };
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

        // Settings size buttons removed – resize via handles on tile edges

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
            const selectedOpt = e.target.options[e.target.selectedIndex];
            this.filterContentByDatapoint(selectedOpt?.dataset.type || '', 'settings-tile-content');
            this.saveDashboard();
        };

        document.getElementById('add-tile-datapoint').onchange = (e) => {
            const selectedOpt = e.target.options[e.target.selectedIndex];
            this.filterContentByDatapoint(selectedOpt?.dataset.type || '', 'add-tile-content');
        };

        document.getElementById('add-tile-content').onchange = (e) => {
            if (e.target.value.includes('graph')) {
                this.addColSpan = 3;
                this.addRowSpan = 3;
            } else if (e.target.value.includes('switch')) {
                this.addColSpan = 1;
                this.addRowSpan = 1;
            } else if (this.addColSpan === 3 && this.addRowSpan === 3) {
                this.addColSpan = 1;
                this.addRowSpan = 1;
            }
            this.updateAddSizeDisplay();
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

    async populateDatapoints() {
        try {
            // Gleiche API-Aufrufe wie bei den Listenansichten (Tabellen)
            const [sensors, actuators, devices] = await Promise.all([
                window.API.getSensors(),
                window.API.getActuators(),
                window.API.getDevices()
            ]);
            const allDatapoints = [...sensors, ...actuators]; // Beide Listen zusammenführen

            // Generiere dynamisches HTML für die <option> Tags
            const optionsHTML = `<option value="" data-type="">&mdash; None &mdash;</option>` + 
                allDatapoints.map(dp => {
                    let dpType = '';
                    const t = (dp.type || '').toLowerCase();
                    
                    // Mapping des Datenbank-Typs auf die Dashboard-Präfixe
                    if (t === 'temperature') dpType = 'sensor.temp';
                    else if (t === 'energy') dpType = 'sensor.energy';
                    else if (t === 'switch') dpType = 'switch.light';
                    else if (t === 'shutter') dpType = 'switch.shutter';
                    
                    const dev = devices.find(d => d.id === dp.deviceId) || {};
                    const loc = dev.location ? ` (${dev.location})` : '';
                    
                    return `<option value="${dp.id}" data-type="${dpType}">${dp.name}${loc}</option>`;
                }).join('');

            const addSelect = document.getElementById('add-tile-datapoint');
            const settingsSelect = document.getElementById('settings-tile-datapoint');
            
            if (addSelect) addSelect.innerHTML = optionsHTML;
            if (settingsSelect) settingsSelect.innerHTML = optionsHTML;
        } catch (err) {
            console.error("Fehler beim Laden der Datenpunkte fürs Dashboard:", err);
        }
    },

    updateAddSizeDisplay() {
        document.getElementById('add-size-display').innerHTML = `${this.addColSpan} &times; ${this.addRowSpan}`;
        
        const isGraph = document.getElementById('add-tile-content')?.value.includes('graph');
        const isSwitch = document.getElementById('add-tile-content')?.value.includes('switch');
        
        if (isGraph || isSwitch) {
            document.getElementById('add-btn-col-plus').disabled  = true;
            document.getElementById('add-btn-col-minus').disabled = true;
            document.getElementById('add-btn-row-plus').disabled  = true;
            document.getElementById('add-btn-row-minus').disabled = true;
        } else {
            document.getElementById('add-btn-col-plus').disabled  = this.addColSpan >= this.MAX_COL;
            document.getElementById('add-btn-col-minus').disabled = this.addColSpan <= 1;
            document.getElementById('add-btn-row-plus').disabled  = this.addRowSpan >= this.MAX_ROW;
            document.getElementById('add-btn-row-minus').disabled = this.addRowSpan <= 1;
        }
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
        window.API.saveDashboard(state);
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

            // Hier holen wir die Werte mit Fallback || null
            const addDp = document.getElementById('add-tile-datapoint')?.value || null;
            const addCt = document.getElementById('add-tile-content')?.value || null;
            if (addDp) tile.dataset.datapoint = addDp;
            if (addCt) tile.dataset.contentType = addCt;
        }

        this.container.appendChild(tile);
        this.initTile(tile);
        if (tile.dataset.contentType) this.renderTileContent(tile);
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

        tile.querySelector('.tile-remove-btn')?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            tile.remove();
            this.refreshGhosts();
            this.saveDashboard();
        });

        // Resize handle – right edge (col): mousedown drag to snap to grid columns
        const colHandle = tile.querySelector('.tile-resize-col');
        colHandle?.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.startResize(e, tile, 'col');
        });

        // Resize handle – bottom edge (row): mousedown drag to snap to grid rows
        const rowHandle = tile.querySelector('.tile-resize-row');
        rowHandle?.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.startResize(e, tile, 'row');
        });

        tile.addEventListener('dragstart', (e) => {
            if (this.resizeSrc) return; // handle drag takes priority
            this.dragSrc = tile;
            setTimeout(() => tile.classList.add('dragging'), 0);
            e.dataTransfer.setData('text/plain', 'move');
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
        const dpSelect = document.getElementById('settings-tile-datapoint');
        const selectedOpt = dpSelect.options[dpSelect.selectedIndex];
        this.filterContentByDatapoint(selectedOpt?.dataset.type || '', 'settings-tile-content');
        document.getElementById('settings-tile-content').value  = tile.dataset.contentType || '';
        this.updateModalButtons();
        this.settingsModal.classList.remove('hidden');
    },

    // ── Content type registry ────────────────────────────────────────────────
    // API: Extend CONTENT_TYPES to add new tile renderers.
    // Each render() will later receive live data from fetchTileData(datapoint, type)
    CONTENT_TYPES: {
        'temp-current':   { 
            render: () => `<div class="tile-value">-- °C</div>`,
            init: async (container, datapoint) => {
                if (!datapoint) return;
                try {
                    const data = await window.API.getSensorData(datapoint);
                    if (data && data.length > 0) {
                        const latest = data[data.length - 1]; // Letzter Wert im Array
                        const val = latest.temperature !== undefined ? latest.temperature : latest.value;
                        container.querySelector('.tile-value').textContent = `${val} °C`;
                    }
                } catch (e) { console.error("Fehler beim Laden von", datapoint, e); }
            }
        },
        'temp-graph':     { 
            init: (container, datapoint) => new Graph(container, datapoint, { metrics: ['temperature', 'humidity'] }) 
        },
        'energy-current': { 
            render: () => `<div class="tile-value">-- kWh</div>`,
            init: async (container, datapoint) => {
                if (!datapoint) return;
                try {
                    const data = await window.API.getSensorData(datapoint);
                    if (data && data.length > 0) {
                        const latest = data[data.length - 1]; // Letzter Wert im Array
                        const val = latest.power !== undefined ? latest.power : latest.value;
                        container.querySelector('.tile-value').textContent = `${val} kWh`;
                    }
                } catch (e) { console.error("Fehler beim Laden von", datapoint, e); }
            }
        },
        'energy-graph':   { 
            init: (container, datapoint) => new Graph(container, datapoint, { metrics: ['power', 'voltage', 'current'] }) 
        },
        'switch-light':   { 
            init: (container, datapoint) => SwitchRenderer.render(container, 'switch-light') 
        },
        'switch-shutter': {
            init: (container, datapoint) => SwitchRenderer.render(container, 'switch-shutter')
        }
    },

    renderTileContent(tile) {
        tile.querySelector('.tile-content')?.remove();
        const type = tile.dataset.contentType;
        if (!type || !this.CONTENT_TYPES[type]) return;

        let isFixedSize = false;

        // Erzwinge 3x3 für alle Graph-Tiles
        if (type.includes('graph')) {
            tile.dataset.colSpan = 3;
            tile.dataset.rowSpan = 3;
            this.applyPosition(tile);
            isFixedSize = true;
        } else if (type.includes('switch')) {
            tile.dataset.colSpan = 1;
            tile.dataset.rowSpan = 1;
            this.applyPosition(tile);
            isFixedSize = true;
        }

        // Resize-Handles ausblenden, falls die Kachel eine feste Größe haben muss
        const colHandle = tile.querySelector('.tile-resize-col');
        const rowHandle = tile.querySelector('.tile-resize-row');
        if (colHandle) colHandle.style.display = isFixedSize ? 'none' : '';
        if (rowHandle) rowHandle.style.display = isFixedSize ? 'none' : '';

        const div = document.createElement('div');
        div.className = 'tile-content';
        tile.appendChild(div);

        if (typeof this.CONTENT_TYPES[type].render === 'function') {
            const html = this.CONTENT_TYPES[type].render();
            if (html) div.innerHTML = html;
        }
        
        if (typeof this.CONTENT_TYPES[type].init === 'function') {
            this.CONTENT_TYPES[type].init(div, tile.dataset.datapoint);
        }
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
        'switch.light':  ['switch-light'],
        'switch.shutter':['switch-shutter'],
    },

    filterContentByDatapoint(datapoint, selectId = 'settings-tile-content') {
        const select  = document.getElementById(selectId);
        if (!select) return;
        const allowed = Object.entries(this.DATAPOINT_CONTENT_MAP)
            .filter(([prefix]) => (datapoint || '').startsWith(prefix))
            .flatMap(([, types]) => types);
        [...select.options].forEach(opt => {
            opt.hidden = opt.value !== '' && allowed.length > 0 && !allowed.includes(opt.value);
        });
        if (allowed.length > 0 && !allowed.includes(select.value)) {
            select.value = '';
            select.dispatchEvent(new Event('change')); // Event feuern, damit Größenanzeige resettet
        }
    },

    resizeActiveTile(direction) {
        // Resize via handles on tile edges – this method is no longer used
    },

    updateModalButtons() {
        // Size buttons removed from config modal – resize via handles on tile edges
    },

    createTileHTML(label) {
        return `<span class="tile-label">${label}</span>
            <div class="tile-config-wrapper">
                <button class="tile-remove-btn" title="Remove">✕</button>
                <button class="tile-edit-btn" title="Configure"><img src="assets/icons/gear-svgrepo-com.svg"></button>
            </div>
            <div class="tile-resize-handle tile-resize-col" title="Drag to resize width"></div>
            <div class="tile-resize-handle tile-resize-row" title="Drag to resize height"></div>`;
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
                g.addEventListener('dragover', (e) => { e.preventDefault(); g.classList.add('drag-over'); });
                g.addEventListener('dragleave', (e) => { if (!g.contains(e.relatedTarget)) g.classList.remove('drag-over'); });
                g.addEventListener('drop', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    g.classList.remove('drag-over');
                    if (this.resizeSrc) {
                        this.applyResizeDrop(g);
                    } else if (this.dragSrc) {
                        this.applyMoveDrop(g);
                    }
                });
                this.container.appendChild(g);
            }
        }
    },

    startResize(e, tile, type) {
        this.resizeSrc = { tile, type };
        let lastSnap = null;

        const onMove = (ev) => {
            const els = document.elementsFromPoint(ev.clientX, ev.clientY);
            const ghost = els.find(el => el.classList.contains('ghost-tile'));

            this.container.querySelectorAll('.ghost-tile.resize-target').forEach(g => g.classList.remove('resize-target'));

            if (!ghost) return;
            const tc = +tile.dataset.gridCol, tr = +tile.dataset.gridRow;
            const gc = +ghost.dataset.gridCol, gr = +ghost.dataset.gridRow;

            if (type === 'col' && gc >= tc) {
                const newCs = gc - tc + 1;
                if (newCs !== lastSnap) {
                    lastSnap = newCs;
                    // live preview
                    tile.style.gridColumn = `${tc} / span ${newCs}`;
                    ghost.classList.add('resize-target');
                }
            } else if (type === 'row' && gr >= tr) {
                const newRs = gr - tr + 1;
                if (newRs !== lastSnap) {
                    lastSnap = newRs;
                    tile.style.gridRow = `${tr} / span ${newRs}`;
                    ghost.classList.add('resize-target');
                }
            }
        };

        const onUp = (ev) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.container.querySelectorAll('.ghost-tile.resize-target').forEach(g => g.classList.remove('resize-target'));

            const els = document.elementsFromPoint(ev.clientX, ev.clientY);
            const ghost = els.find(el => el.classList.contains('ghost-tile'));
            if (ghost) {
                this.applyResizeDrop(ghost);
            } else {
                // revert preview
                this.applyPosition(tile);
                this.resizeSrc = null;
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    applyResizeDrop(g) {
        const { tile, type } = this.resizeSrc;
        const tc = +tile.dataset.gridCol, tr = +tile.dataset.gridRow;
        const tcs = +tile.dataset.colSpan, trs = +tile.dataset.rowSpan;
        const gc = +g.dataset.gridCol, gr = +g.dataset.gridRow;
        if (type === 'col') {
            const newCs = gc - tc + 1;
            if (newCs >= 1 && newCs <= this.MAX_COL) {
                // check only the newly added columns (right of current span)
                const ok = newCs <= tcs || !this.isAreaOccupied(tr, tc + tcs, trs, newCs - tcs, tile);
                if (ok) { tile.dataset.colSpan = newCs; this.applyPosition(tile); this.saveDashboard(); }
                else { this.applyPosition(tile); } // revert preview
            } else { this.applyPosition(tile); }
        } else {
            const newRs = gr - tr + 1;
            if (newRs >= 1 && newRs <= this.MAX_ROW) {
                // check only the newly added rows (below current span)
                const ok = newRs <= trs || !this.isAreaOccupied(tr + trs, tc, newRs - trs, tcs, tile);
                if (ok) { tile.dataset.rowSpan = newRs; this.applyPosition(tile); this.saveDashboard(); }
                else { this.applyPosition(tile); } // revert preview
            } else { this.applyPosition(tile); }
        }
        this.resizeSrc = null;
        this.refreshGhosts();
    },

    applyMoveDrop(g) {
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
        this.refreshGhosts();
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
        // Drop logic is handled directly on ghost-tile elements
        if (this.hoveredGhost) this.hoveredGhost.classList.remove('drag-over');
        this.hoveredGhost = null;
    },

    showError(target, msg) {
        const err = document.createElement('div');
        err.className = 'swap-error';
        err.textContent = msg;
        target.appendChild(err);
        setTimeout(() => err.remove(), 2000);
    }
};

window.GridManager = GridManager;
document.addEventListener('DOMContentLoaded', () => GridManager.init());
