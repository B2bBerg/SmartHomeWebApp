/**
 * tile.js – Dashboard tile grid management
 */

const TileManager = {
    MAX_COL: 3,
    MAX_ROW: 3,
    COLS: 6,
    rowHeight: 100,
    dragSrc: null,
    resizeSrc: null,
    editMode: false,
    hoveredGhost: null,
    activeSettingsTile: null,

    // Pending add-tile size selection
    addColSpan: 1,
    addRowSpan: 1,

    // --- ZENTRALE REGISTRY FÜR KACHEL-MODULE ---
    TILE_REGISTRY: {
        'Value': {
            name: 'Aktueller Wert (Text)', fixedSize: false, defaultColSpan: 1, defaultRowSpan: 1,
            roles: [{ id: 'main', label: 'Sensor-Datenpunkt', type: 'sensor' }],
            render: () => `<div class="tile-value">--</div>`,
            init: async (container, dps) => {
                const dpId = dps?.main || dps?.default;
                if (!dpId) return;
                try {
                let val = 'N/A';
                
                // Versuche zuerst Livedaten abzurufen
                const liveData = await window.API.getLiveData().catch(() => ({}));
                if (liveData && liveData[dpId] !== undefined) {
                    val = liveData[dpId];
                } else {
                    // Fallback auf Historie
                    const data = await window.API.getSensorData(dpId);
                    if (data && data.length > 0) {
                        const latest = data[data.length - 1];
                        val = latest.temperature ?? latest.power ?? latest.value ?? 'N/A';
                    }
                }
                container.querySelector('.tile-value').textContent = val;
                } catch (e) { console.error("Fehler beim Laden von", dpId, e); }
            }
        },
        'Graph': {
            name: 'Diagramm (Zeitreihe)', fixedSize: true, defaultColSpan: 3, defaultRowSpan: 3,
            hasUnitFilter: true,
            roles: [{ id: 'main', label: 'Datenpunkte', multiple: true, type: 'sensor' }],
            init: (container, dps) => { 
                new Graph(container, dps?.main || dps?.default || ''); // Nutzt standardmässig nur 'value' -> blendet Dropdown aus
            }
        },
        'Switch': {
            name: 'Schalter (Ein/Aus)', fixedSize: true, defaultColSpan: 1, defaultRowSpan: 1,
            roles: [{ id: 'main', label: 'Aktor-Datenpunkt', type: 'actuator' }],
            render: (container) => { SwitchRenderer.renderToggle(container); },
            init: (container, dps) => { SwitchRenderer.setupToggle(container, dps?.main || dps?.default); }
        },
        'Shutter 2-Way': {
            name: 'Rollladen (Auf/Ab)', fixedSize: true, defaultColSpan: 1, defaultRowSpan: 1,
            roles: [{ id: 'up', label: 'Datenpunkt: Auf', type: 'actuator' }, { id: 'down', label: 'Datenpunkt: Ab', type: 'actuator' }],
            render: (container) => { SwitchRenderer.renderShutter2Way(container); },
            init: (container, dps) => { SwitchRenderer.setupShutter2Way(container, dps); }
        },
        'Shutter 3-Way': {
            name: 'Rollladen (Auf/Stop/Ab)', fixedSize: true, defaultColSpan: 1, defaultRowSpan: 1,
            roles: [{ id: 'up', label: 'Datenpunkt: Auf', type: 'actuator' }, { id: 'stop', label: 'Datenpunkt: Stop', type: 'actuator' }, { id: 'down', label: 'Datenpunkt: Ab', type: 'actuator' }],
            render: (container) => { SwitchRenderer.renderShutter3Way(container); },
            init: (container, dps) => { SwitchRenderer.setupShutter3Way(container, dps); }
        }
    },

    createInstance(config) {
        const instance = Object.create(this);
        instance.isInstance = true;
        instance.container = typeof config.container === 'string' ? document.querySelector(config.container) : config.container;
        instance.storageKey = config.storageKey || 'main';
        instance.editBtn = config.editBtn ? document.querySelector(config.editBtn) : null;
        instance.addBtn = config.addBtn ? document.querySelector(config.addBtn) : null;
        
        // Dynamische Grid-Konfiguration (mit Fallbacks auf Standardwerte)
        instance.COLS = config.cols || 6;
        instance.MAX_COL = config.maxColSpan || 3;
        instance.MAX_ROW = config.maxRowSpan || 3;
        instance.rowHeight = config.rowHeight || 100;
        instance.allowedDatapoints = config.allowedDatapoints || null;

        instance.editMode = false;
        instance.dragSrc = null;
        instance.resizeSrc = null;
        instance.hoveredGhost = null;
        instance.activeSettingsTile = null;
        instance.addColSpan = 1;
        instance.addRowSpan = 1;
        return instance;
    },

    init() {
        // --- Modals vor Zerstörung durch SPA-Routing schützen ---
        // Da der #content-Bereich beim Navigieren überschrieben wird, verschieben wir
        // die Modals sicher in den globalen <body>. Entstehende Duplikate werden gelöscht.
        const mList = document.querySelectorAll('#tile-modal');
        if (mList.length > 0) {
            document.body.appendChild(mList[0]);
            for (let i = 1; i < mList.length; i++) mList[i].remove();
        }
        const smList = document.querySelectorAll('#tile-settings-modal');
        if (smList.length > 0) {
            document.body.appendChild(smList[0]);
            for (let i = 1; i < smList.length; i++) smList[i].remove();
        }

        // Für das Haupt-Dashboard (Singleton) müssen die Referenzen IMMER neu geladen werden,
        // da die HTML-Elemente beim Wechseln der Ansicht im SPA-Routing neu gerendert werden.
        if (!this.isInstance) {
            this.container = document.querySelector('.overview-container');
            this.storageKey = 'main';
            this.editBtn = document.getElementById('edit-mode-btn');
            this.addBtn = document.getElementById('add-tile-btn');
            
            // Standardwerte für das Haupt-Dashboard
            this.COLS = 6;
            this.MAX_COL = 3;
            this.MAX_ROW = 3;
            this.rowHeight = 100;
            this.allowedDatapoints = null;
        }
        
        // Modals sind global, müssen aber nach einem Ansichtswechsel zwingend neu verknüpft werden
        this.modal = document.getElementById('tile-modal');
        this.modalInput = document.getElementById('tile-modal-input');
        this.settingsModal = document.getElementById('tile-settings-modal');

        if (!this.container) return;
        
        // Container Grid-Eigenschaften dynamisch anwenden
        this.container.style.gridTemplateColumns = `repeat(${this.COLS}, 1fr)`;
        this.container.style.gridAutoRows = `${this.rowHeight}px`;

        this.setupEventListeners();

        // Basis-Daten und Typen aus der Datenbank laden
        this.loadSystemData().then(() => {
            this.updateSelectOptions('add');
            this.updateSelectOptions('settings');
            window.API.getDashboardTiles(this.storageKey)
                .then(data => { 
                    console.log("📡 API Response Dashboard Tiles:", data);
                    if (data && data.length > 0) {
                        this.loadDashboard(data); 
                    } else {
                        console.warn("⚠️ Backend hat ein leeres Array [ ] geliefert. Prüfe Node.js DB-Abfrage.");
                    }
                })
                .catch(err => console.error(`❌ Dashboard Ladefehler:`, err));
        });

        this.refreshGhosts();
    },

    setupEventListeners() {
        // ── Edit mode ────────────────────────────────────────────────────────
        if (this.editBtn) {
            this.editBtn.onclick = () => {
                this.editMode = !this.editMode;
                this.editBtn.classList.toggle('active', this.editMode);
                this.container.classList.toggle('edit-mode', this.editMode);
                this.container.querySelectorAll('.dynamic-tile').forEach(t => t.draggable = this.editMode);
                this.editBtn.querySelector('img').src = this.editMode
                    ? 'assets/icons/circle-exclamation-check-svgrepo-com.svg'
                    : 'assets/icons/gear-svgrepo-com.svg';
                if (!this.editMode) this.saveDashboard();
                this.refreshGhosts();
            };
        }

        // ── Add tile modal ───────────────────────────────────────────────────
        if (this.addBtn) {
            this.addBtn.onclick = () => {
                this.addColSpan = 1;
                this.addRowSpan = 1;
                if (this.modalInput) this.modalInput.value = '';
                
                const addCt = document.getElementById('add-tile-content');
                if (addCt) addCt.value = '';
                
                this.updateSelectOptions('add', '', {});
                if (this.modal) {
                    this.modal.classList.remove('hidden');
                    this.modalInput.focus();
                }
            };
        }

        if (document.getElementById('tile-modal-confirm')) {
            document.getElementById('tile-modal-confirm').onclick = () => {
                if (!this.modalInput.value.trim()) { this.modalInput.focus(); return; }
                this.addNewTile();
            };
        }
        if (document.getElementById('tile-modal-cancel')) document.getElementById('tile-modal-cancel').onclick  = () => this.modal.classList.add('hidden');

        // ── Settings modal ───────────────────────────────────────────────────
        if (document.getElementById('tile-settings-close')) {
            document.getElementById('tile-settings-close').onclick = () => {
                if (this.activeSettingsTile) {
                    const dpObj = {};
                    const selects = document.querySelectorAll('#settings-tile-dp-container .dynamic-dp-select');
                    selects.forEach(sel => {
                        if (sel.dataset.multiple === 'true') {
                            const checked = Array.from(sel.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                            dpObj[sel.dataset.role] = checked.join(',');
                        } else if (sel.multiple) {
                            dpObj[sel.dataset.role] = Array.from(sel.selectedOptions).filter(o=>o.value).map(o=>o.value).join(',');
                        } else {
                            dpObj[sel.dataset.role] = sel.value;
                        }
                    });
                    
                    const unitFilterSelect = document.querySelector('#settings-tile-dp-container .tile-unit-filter');
                    if (unitFilterSelect) dpObj.unitFilter = unitFilterSelect.value;
                    
                    this.activeSettingsTile.dataset.datapoint = JSON.stringify(dpObj);
                    
                    // Zwingt die Kachel (z.B. den Graphen), sich mit den neuen Einstellungen sofort neu zu zeichnen
                    this.renderTileContent(this.activeSettingsTile);
                }
                this.settingsModal.classList.add('hidden');
                this.activeSettingsTile = null;
                this.saveDashboard();
            };
        }

        if (document.getElementById('tile-settings-delete')) {
            document.getElementById('tile-settings-delete').onclick = async () => {
                if (!this.activeSettingsTile) return;
                if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Objekt gelöscht werden soll?')) {
                    this.activeSettingsTile.remove();
                    this.settingsModal.classList.add('hidden');
                    this.activeSettingsTile = null;
                    this.refreshGhosts();
                    this.saveDashboard();
                }
            };
        }

        if (document.getElementById('settings-tile-label')) {
            document.getElementById('settings-tile-label').oninput = (e) => {
                if (this.activeSettingsTile)
                    this.activeSettingsTile.querySelector('.tile-label').textContent = e.target.value;
            };
        }

        if (document.getElementById('add-tile-content')) {
            document.getElementById('add-tile-content').onchange = (e) => {
                const selectedType = e.target.value;
                const reg = this.TILE_REGISTRY[selectedType];
                if (reg && reg.fixedSize) {
                    this.addColSpan = reg.defaultColSpan || 1;
                    this.addRowSpan = reg.defaultRowSpan || 1;
                }
                this.updateSelectOptions('add', selectedType, {});
            };
        }

        if (document.getElementById('settings-tile-content')) {
            document.getElementById('settings-tile-content').onchange = (e) => {
                if (!this.activeSettingsTile) return;
                const newType = e.target.value;
                this.activeSettingsTile.dataset.contentType = newType;
                this.updateSelectOptions('settings', newType, {});
                
                // Setzt die Kachel-Grösse auf den Standard des neuen Typs zurück
                const reg = this.TILE_REGISTRY[newType];
                if (reg) {
                    this.activeSettingsTile.dataset.colSpan = reg.defaultColSpan || 1;
                    this.activeSettingsTile.dataset.rowSpan = reg.defaultRowSpan || 1;
                }
                
                this.activeSettingsTile.dataset.datapoint = '{}';
                this.renderTileContent(this.activeSettingsTile);
                this.saveDashboard();
            };
        }

        // ── Drag & drop delegation ───────────────────────────────────────────
        if (this.container) {
            this.container.addEventListener('dragover',  e => this.handleContainerDragOver(e));
            this.container.addEventListener('dragleave', e => this.handleContainerDragLeave(e));
            this.container.addEventListener('drop',      e => this.handleContainerDrop(e));
        }
    },

    async loadSystemData() {
        try {
            const [sensors, actuators, devices, tileTypes, unitTypes] = await Promise.all([
                window.API.getSensors().catch(err => []),
                window.API.getActuators().catch(err => []),
                window.API.getDevices().catch(err => []),
                window.API.getTileTypes().catch(err => []),
                (window.API.getUnitTypes ? window.API.getUnitTypes().catch(err => []) : [])
            ]);
            this.systemData = { sensors, actuators, devices, tileTypes, unitTypes };
        } catch (err) {
            console.error("Fehler beim Laden der Systemdaten fürs Dashboard:", err);
        }
    },

    updateSelectOptions(ctx, selectedType = '', selectedDatapoints = {}, activeUnitId = '') {
        const contentSelect = document.getElementById(`${ctx}-tile-content`);
        const dpContainer = document.getElementById(`${ctx}-tile-dp-container`);
        if (!contentSelect || !dpContainer || !this.systemData) return;

        // Dropdown für Tile Types (Inhalt) aktualisieren
        if (contentSelect.options.length <= 1) {
            const optionsHtml = ['<option value="">&mdash; Keine &mdash;</option>'];
            
            const availableTypes = new Set(Object.keys(this.TILE_REGISTRY));
            if (this.systemData.tileTypes) this.systemData.tileTypes.forEach(tt => availableTypes.add(tt.name));
            
            Array.from(availableTypes).sort().forEach(ttName => {
                const reg = this.TILE_REGISTRY[ttName];
                optionsHtml.push(`<option value="${ttName}">${reg ? reg.name : ttName}</option>`);
            });
            contentSelect.innerHTML = optionsHtml.join('');
        }
        contentSelect.value = selectedType;

        // Dynamische Selects für Datenpunkte basierend auf den Rollen der Kachel generieren
        dpContainer.innerHTML = '';
        const reg = this.TILE_REGISTRY[selectedType];
        if (!reg || !reg.roles) return;

        if (reg.hasUnitFilter) {
            let unitOptionsHtml = '<option value="">-- Alle Einheiten --</option>';
            if (this.systemData.unitTypes) {
                this.systemData.unitTypes.forEach(u => {
                    const isSel = (u.name === activeUnitId) ? 'selected' : '';
                    unitOptionsHtml += `<option value="${u.name}" ${isSel}>${u.name}</option>`;
                });
            }
            dpContainer.innerHTML += `
                <div class="settings-group">
                    <label>Nach Einheit filtern</label>
                    <select class="tile-unit-filter" data-ctx="${ctx}">
                        ${unitOptionsHtml}
                    </select>
                </div>
            `;
        }

        const allDps = [...this.systemData.sensors, ...this.systemData.actuators];

        const buildOptions = (selectedVal, isMultiple, roleType) => {
            let html = isMultiple ? '' : '<option value="">&mdash; Bitte wählen &mdash;</option>';
            
            let filteredDps = allDps;
            if (roleType === 'sensor') filteredDps = this.systemData.sensors || [];
            if (roleType === 'actuator') filteredDps = this.systemData.actuators || [];

            if (reg.hasUnitFilter && activeUnitId) {
                filteredDps = filteredDps.filter(dp => dp.unit === activeUnitId);
            }

            if (filteredDps.length === 0) return isMultiple ? '<div style="color:var(--text-secondary); font-size: 0.8rem;">Keine Datenpunkte verfügbar</div>' : '<option disabled>Keine Datenpunkte verfügbar</option>';

            const localGroups = {};
            const otherGroups = {};

            filteredDps.forEach(dp => {
                const dev = this.systemData.devices.find(d => d.id === dp.deviceId);
                const devName = dev ? (dev.name || dev.modelName) : 'Ohne Gerät';
                
                if (this.allowedDatapoints && this.allowedDatapoints.includes(dp.id)) {
                    if (!localGroups[devName]) localGroups[devName] = [];
                    localGroups[devName].push(dp);
                } else {
                    if (!otherGroups[devName]) otherGroups[devName] = [];
                    otherGroups[devName].push(dp);
                }
            });

            const renderGroup = (label, dpsGroup) => {
                let groupHtml = '';
                if (isMultiple) {
                    groupHtml += `<div style="font-weight: 600; font-size: 0.8rem; margin: 0.6rem 0 0.3rem 0; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 2px;">${label}</div>`;
                    groupHtml += dpsGroup.map(dp => {
                        const isSel = selectedVal ? selectedVal.split(',').includes(dp.id) : false;
                        return `<label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; padding: 4px 0; color: var(--text-secondary); transition: color 0.2s;">
                            <input type="checkbox" value="${dp.id}" ${isSel ? 'checked' : ''} style="appearance: auto; width: auto; background: none; border: none; padding: 0; margin: 0;">
                            ${dp.name}
                        </label>`;
                    }).join('');
                } else {
                    groupHtml += `<optgroup label="${label}">`;
                    groupHtml += dpsGroup.map(dp => {
                        const isSel = selectedVal === dp.id;
                        return `<option value="${dp.id}" ${isSel ? 'selected' : ''}>${dp.name}</option>`;
                    }).join('');
                    groupHtml += `</optgroup>`;
                }
                return groupHtml;
            };

            for (const [devName, dpsGroup] of Object.entries(localGroups)) {
                html += renderGroup(`📍 ${devName}`, dpsGroup);
            }

            for (const [devName, dpsGroup] of Object.entries(otherGroups)) {
                html += renderGroup(`🌐 ${devName}`, dpsGroup);
            }

            if (isMultiple && selectedVal) {
                const selectedIds = selectedVal.split(',');
                const filteredIds = filteredDps.map(d => d.id);
                const missingIds = selectedIds.filter(id => id && !filteredIds.includes(id));
                if (missingIds.length > 0) {
                    html += `<div style="display:none;">`;
                    missingIds.forEach(id => {
                        html += `<input type="checkbox" value="${id}" checked>`;
                    });
                    html += `</div>`;
                }
            }

            return html;
        };

        reg.roles.forEach(role => {
            const currVal = selectedDatapoints[role.id] || '';
            if (role.multiple) {
                dpContainer.innerHTML += `
                    <div class="settings-group">
                        <label>${role.label}</label>
                        <div class="dynamic-dp-select" data-role="${role.id}" data-multiple="true" style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.2rem 0.6rem 0.6rem; background: var(--input-bg);">
                            ${buildOptions(currVal, true, role.type)}
                        </div>
                    </div>
                `;
            } else {
                dpContainer.innerHTML += `
                    <div class="settings-group">
                        <label>${role.label}</label>
                        <select class="dynamic-dp-select" data-role="${role.id}">
                            ${buildOptions(currVal, false, role.type)}
                        </select>
                    </div>
                `;
            }
        });

        const unitFilterSelect = dpContainer.querySelector('.tile-unit-filter');
        if (unitFilterSelect) {
            unitFilterSelect.addEventListener('change', (e) => {
                const newUnit = e.target.value;
                const currentDps = {};
                dpContainer.querySelectorAll('.dynamic-dp-select').forEach(sel => {
                    if (sel.dataset.multiple === 'true') {
                        const checked = Array.from(sel.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                        currentDps[sel.dataset.role] = checked.join(',');
                    } else if (sel.multiple) {
                        currentDps[sel.dataset.role] = Array.from(sel.selectedOptions).filter(o=>o.value).map(o=>o.value).join(',');
                    } else {
                        currentDps[sel.dataset.role] = sel.value;
                    }
                });
                this.updateSelectOptions(ctx, selectedType, currentDps, newUnit);
            });
        }
    },

    getDashboardState() {
        return Array.from(this.container.querySelectorAll('.dynamic-tile')).map(tile => {
            let dpObj = {};
            try { dpObj = JSON.parse(tile.dataset.datapoint); } catch(e) {}
            return {
                id:          tile.dataset.id,
                label:       tile.querySelector('.tile-label').textContent,
                col:         parseInt(tile.dataset.gridCol),
                row:         parseInt(tile.dataset.gridRow),
                colSpan:     parseInt(tile.dataset.colSpan),
                rowSpan:     parseInt(tile.dataset.rowSpan),
                contentType: tile.dataset.contentType || '',
                datapoint:   dpObj
            };
        });
    },

    loadDashboard(jsonData) {
        this.container.querySelectorAll('.dynamic-tile').forEach(t => t.remove());
        if (Array.isArray(jsonData)) jsonData.forEach(config => this.addNewTile(config));
        this.refreshGhosts();
    },

    async saveDashboard() {
        const state = this.getDashboardState();
        try {
            // Nutze saveDashboardTiles, um die Kacheln auf dem Server zu aktualisieren
            const updatedTiles = await window.API.saveDashboardTiles(this.storageKey, state);
            console.log('Dashboard state saved:', this.storageKey);
            // Aktualisiere das Grid mit echten Server-IDs (ersetzt temporäre tile-tmp-X IDs)
            if (updatedTiles && updatedTiles.length > 0) {
                if (this.editMode === false) {
                    this.loadDashboard(updatedTiles);
                } else {
                    // Im Edit-Modus nur die IDs der temporären Kacheln aktualisieren,
                    // ohne das DOM neu zu zeichnen (verhindert Abbruch von Drag & Drop)
                    updatedTiles.forEach(serverTile => {
                        const domTile = Array.from(this.container.querySelectorAll('.dynamic-tile')).find(t => 
                            t.dataset.gridCol == serverTile.col && 
                            t.dataset.gridRow == serverTile.row && 
                            t.querySelector('.tile-label').textContent == serverTile.label
                        );
                        if (domTile && domTile.dataset.id.startsWith('tile-tmp-')) {
                            domTile.dataset.id = serverTile.id;
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Fehler beim Speichern des Dashboards:", error);
        }
        return state;
    },

    addNewTile(config = null) {
        const label = config ? config.label : this.modalInput.value.trim();
        if (!label) return;

        const tile = document.createElement('div');
        tile.className    = 'tile dynamic-tile';
        const tmpId = 'tile-tmp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        tile.dataset.id   = config ? config.id : tmpId;
        tile.innerHTML    = this.createTileHTML(label);

        if (config) {
            // Robustes Mapping: Akzeptiert flache DTOs (col) oder direkte Datenbank-Namen (col_pos/colPos)
            tile.dataset.gridCol = config.col || config.colPos || config.col_pos || 1;
            tile.dataset.gridRow = config.row || config.rowPos || config.row_pos || 1;
            tile.dataset.colSpan = config.colSpan || config.colspan || config.col_span || 1;
            tile.dataset.rowSpan = config.rowSpan || config.rowspan || config.row_span || 1;
            
            let ct = config.contentType || config.tileTypeName;
            let dp = config.datapoint;
            
            // Fallback: Falls das Backend das config-JSON verschachtelt oder als String zurückgibt
            if (config.config) {
                try {
                    const parsed = typeof config.config === 'string' ? JSON.parse(config.config) : config.config;
                    if (!ct) ct = parsed.contentType;
                    if (!dp) dp = parsed.datapoint;
                } catch (e) {}
            }

            if (ct) tile.dataset.contentType = ct;
            if (dp) tile.dataset.datapoint = typeof dp === 'object' ? JSON.stringify(dp) : dp;
        } else {
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

            // Werte aus den dynamischen Dropdowns sammeln
            const dpObj = {};
            const selects = document.querySelectorAll('#add-tile-dp-container .dynamic-dp-select');
            selects.forEach(sel => {
                if (sel.dataset.multiple === 'true') {
                    const checked = Array.from(sel.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                    dpObj[sel.dataset.role] = checked.join(',');
                } else if (sel.multiple) {
                    dpObj[sel.dataset.role] = Array.from(sel.selectedOptions).filter(o=>o.value).map(o=>o.value).join(',');
                } else {
                    dpObj[sel.dataset.role] = sel.value;
                }
            });

            const addCt = document.getElementById('add-tile-content')?.value || null;
            
            const unitFilterSelect = document.querySelector('#add-tile-dp-container .tile-unit-filter');
            if (unitFilterSelect) dpObj.unitFilter = unitFilterSelect.value;

            tile.dataset.datapoint = JSON.stringify(dpObj);
            if (addCt) tile.dataset.contentType = addCt;
        }

        this.container.appendChild(tile);
        this.initTile(tile);
        if (tile.dataset.contentType) this.renderTileContent(tile);
        if (this.editMode) tile.draggable = true;

        if (this.modal) this.modal.classList.add('hidden');
        this.refreshGhosts();
        
        // Kacheln nur speichern, wenn sie manuell hinzugefügt wurden (nicht beim initialen Laden aus der DB)
        if (!config) {
            this.saveDashboard();
        }
    },

    initTile(tile) {
        tile.dataset.colSpan = tile.dataset.colSpan || 1;
        tile.dataset.rowSpan = tile.dataset.rowSpan || 1;

        tile.querySelector('.tile-edit-btn')?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.openSettings(tile);
        });

        tile.querySelector('.tile-remove-btn')?.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Objekt gelöscht werden soll?')) {
                tile.remove();
                this.refreshGhosts();
                this.saveDashboard();
            }
        });

        const colHandle = tile.querySelector('.tile-resize-col');
        colHandle?.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.startResize(e, tile, 'col');
        });

        const rowHandle = tile.querySelector('.tile-resize-row');
        rowHandle?.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.startResize(e, tile, 'row');
        });

        tile.addEventListener('dragstart', (e) => {
            if (this.resizeSrc) return;
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
            if (!sameSize) { this.showError(tile, 'Kacheln müssen gleich gross sein, um sie zu tauschen'); return; }
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
        const cType = tile.dataset.contentType || '';
        let dpObj = {};
        try { dpObj = JSON.parse(tile.dataset.datapoint); } catch(e){}
        const activeUnit = dpObj.unitFilter || '';
        this.updateSelectOptions('settings', cType, dpObj, activeUnit);
        this.settingsModal.classList.remove('hidden');
    },

    renderTileContent(tile) {
        tile.querySelector('.tile-content')?.remove();
        const type = tile.dataset.contentType;
        const reg = this.TILE_REGISTRY[type];
        if (!type || !reg) return;

        const colHandle = tile.querySelector('.tile-resize-col');
        const rowHandle = tile.querySelector('.tile-resize-row');

        if (colHandle) colHandle.style.display = reg.fixedSize ? 'none' : '';
        if (rowHandle) rowHandle.style.display = reg.fixedSize ? 'none' : '';

        const div = document.createElement('div');
        div.className = 'tile-content';
        tile.appendChild(div);

        if (typeof reg.render === 'function') {
            const html = reg.render(div);
            if (html) div.innerHTML = html;
        }
        
        let dpObj = {};
        try { dpObj = JSON.parse(tile.dataset.datapoint); } catch(e){}

        if (typeof reg.init === 'function') {
            reg.init(div, dpObj);
        }
    },

    createTileHTML(label) {
        return `<span class="tile-label">${label}</span>
            <div class="tile-config-wrapper" style="display: flex; gap: 4px;">
                <button class="btn-edit tile-edit-btn" title="Konfigurieren"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                <button class="btn-delete tile-remove-btn" title="Entfernen"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
            </div>
            <div class="tile-resize-handle tile-resize-col" title="Breite anpassen"></div>
            <div class="tile-resize-handle tile-resize-row" title="Höhe anpassen"></div>`;
    },

    applyPosition(el) {
        el.style.gridColumn = `${el.dataset.gridCol} / span ${el.dataset.colSpan}`;
        el.style.gridRow    = `${el.dataset.gridRow} / span ${el.dataset.rowSpan}`;
    },

    getOccupied(skipEl) {
        const occ = new Set();
        if(!this.container) return occ;
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
        if(!this.container) return;
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
                const ok = newCs <= tcs || !this.isAreaOccupied(tr, tc + tcs, trs, newCs - tcs, tile);
                if (ok) { tile.dataset.colSpan = newCs; this.applyPosition(tile); this.saveDashboard(); }
                else { this.applyPosition(tile); } 
            } else { this.applyPosition(tile); }
        } else {
            const newRs = gr - tr + 1;
            if (newRs >= 1 && newRs <= this.MAX_ROW) {
                const ok = newRs <= trs || !this.isAreaOccupied(tr + trs, tc, newRs - trs, tcs, tile);
                if (ok) { tile.dataset.rowSpan = newRs; this.applyPosition(tile); this.saveDashboard(); }
                else { this.applyPosition(tile); }
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
            this.showError(this.dragSrc, 'Kachel passt hier nicht hin');
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

window.TileManager = TileManager;