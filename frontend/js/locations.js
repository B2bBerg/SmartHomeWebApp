/**
 * locations.js – Grafische Kachel-Darstellung der Gebäude-Struktur
 */
const LocationsManager = {
    init() {
        this.container = document.getElementById('locations-container');
        if (!this.container) return;
        this.isEditModeBuildings = false;
        this.isEditModeFloors = false;
        this.isEditModeRooms = false;
        this.pendingRoute = null;
        this.loadData();
    },

    // --- Wird vom Router aufgerufen ---
    loadView(pathParts, state) {
        this.pendingRoute = { pathParts, state };
        if (this.locations) {
            this.applyPendingRoute();
        }
    },

    applyPendingRoute() {
        if (!this.pendingRoute) return;
        const { pathParts, state } = this.pendingRoute;
        this.pendingRoute = null;

        if (state && Object.keys(state).length > 0 && state.view) {
            this.restoreState(state);
            return;
        }

        // URL Parsen (Fallback für direkte Bookmarks/Reloads der Seite)
        if (pathParts.length >= 7 && pathParts[1] === 'building' && pathParts[3] === 'floor' && pathParts[5] === 'room') {
            this.restoreState({ view: 'room', buildingId: pathParts[2], floorId: pathParts[4], roomId: pathParts[6] });
        } else if (pathParts.length >= 5 && pathParts[1] === 'building' && pathParts[3] === 'floor') {
            this.restoreState({ view: 'floor', buildingId: pathParts[2], floorId: pathParts[4] });
        } else if (pathParts.length >= 3 && pathParts[1] === 'building') {
            this.restoreState({ view: 'building', buildingId: pathParts[2] });
        } else {
            this.renderBuildings();
        }
    },

    restoreState(state) {
        if (!state || !this.locations) return;
        
        if (state.view === 'buildings') {
            this.renderBuildings();
        } else if (state.view === 'building' || state.view === 'floor' || state.view === 'room') {
            const b = this.locations.find(x => x.id === state.buildingId);
            if (b) {
                if (state.floorId) this.activeFloorId = state.floorId;
                if (state.roomId) this.activeRoomId = state.roomId;
                this.isEditModeFloors = false;
                this.isEditModeRooms = false;
                this.renderBuildingDetails(b);
            } else {
                this.renderBuildings();
            }
        }
    },

    async openModal(type, title, defaultData, callback) {
        if (type === 'building') {
            const addr = defaultData.address || {};
            
            // 1. Array: Gebäude-Vorlagen laden
            const templates = await window.API.getLocationTypes('building') || [];
            
            // 2. Array: Bereits erfasste Gebäude-Adressen extrahieren (ohne Namen, nur Adressen)
            const existingAddresses = [];
            (this.locations || []).forEach(l => {
                if (l.address && l.address.street && !existingAddresses.find(a => a.street === l.address.street && a.zip === l.address.zip)) {
                    existingAddresses.push(l.address);
                }
            });

            const result = await window.Dialog.formWithTable({
                title: title,
                searchable: false, // Deaktiviert das redundante Tabellen-Suchfeld (Omni-Search aktiv)
                fields: [
                    { id: 'id', type: 'hidden', value: defaultData.id || '' },
                    { id: 'name', label: 'Gebäude Name *', value: defaultData.name || '', fullWidth: true },
                    { id: 'street', label: 'Strasse', value: addr.street || '' },
                    { id: 'number', label: 'Hausnummer', value: addr.number || '' },
                    { id: 'zip', label: 'PLZ', value: addr.zip || '' },
                    { id: 'city', label: 'Ort', value: addr.city || '' },
                    { id: 'country', label: 'Land', value: addr.country || 'Schweiz', fullWidth: true }
                ],
                tables: [
                    {
                        id: 'templates',
                        title: '📋 Gebäude-Vorlagen',
                        columns: [{ key: 'name', label: 'Verfügbare Haus-Typen' }],
                        data: templates,
                        onRowSelect: (row, fields) => {
                            fields.name.value = row.name || '';
                            fields.id.value = row.id || ''; // Speichert DB ID ab, falls Vorlage ausgewählt
                        }
                    },
                    {
                        id: 'addresses',
                        title: '📍 Adress-Datenbank',
                        columns: [
                            { key: 'street', label: 'Strasse', render: (v) => v || '—' },
                            { key: 'number', label: 'Nummer', render: (v) => v || '—' },
                            { key: 'zip', label: 'PLZ', render: (v) => v || '—' },
                            { key: 'city', label: 'Ort', render: (v) => v || '—' },
                            { key: 'country', label: 'Land', render: (v) => v || 'Schweiz' }
                        ],
                        data: existingAddresses,
                        onRowSelect: (row, fields) => {
                            fields.street.value = row.street || '';
                            fields.number.value = row.number || '';
                            fields.zip.value = row.zip || '';
                            fields.city.value = row.city || '';
                            fields.country.value = row.country || 'Schweiz';
                        }
                    }
                ],
                onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                    // Automatische PLZ Auflösung einhängen
                    fields.zip.addEventListener('blur', async () => {
                        if (fields.zip.value.length >= 4 && window.API.lookupCityByZip) {
                            const cities = await window.API.lookupCityByZip(fields.zip.value, fields.country.value);
                            if (cities && cities.length > 0) fields.city.value = cities[0];
                        }
                    });

                    // Gebäude-Name: Wechselt zu Vorlagen und filtert
                    const handleNameInput = (e) => {
                        switchToTab('templates');
                        filterTable(e.target.value);
                    };
                    fields.name.addEventListener('focus', handleNameInput);
                    fields.name.addEventListener('input', handleNameInput);
                    
                    const addressFields = [fields.street, fields.number, fields.zip, fields.city, fields.country];
                    let searchTimeout;

                    // Baut einen kombinierten Suchstring aus allen Adress-Feldern
                    const getCombinedAddressQuery = () => {
                        return `${fields.street.value} ${fields.number.value} ${fields.zip.value} ${fields.city.value}`.trim();
                    };

                    addressFields.forEach(f => {
                        f.addEventListener('focus', (e) => {
                            switchToTab('addresses');
                            filterTable(getCombinedAddressQuery());
                        });

                        f.addEventListener('input', (e) => {
                            switchToTab('addresses');
                            filterTable(getCombinedAddressQuery()); // Tabelle sofort lokal filtern

                            // Live-API Abfrage im Hintergrund starten (ab 3 Zeichen kombinierter Länge)
                            const apiQuery = `${fields.street.value} ${fields.city.value}`.trim();
                            if (apiQuery.length >= 3) {
                                clearTimeout(searchTimeout);
                                searchTimeout = setTimeout(async () => {
                                    try {
                                        const results = await window.API.searchAddresses(apiQuery);
                                        const mapped = results.map(r => r.obj);
                                        
                                        // Caching: Eigene (bereits erfasste) Adressen mit API-Treffern mischen, um keine zu verlieren
                                        const combined = [...existingAddresses];
                                        mapped.forEach(m => {
                                            if (!combined.find(c => c.street === m.street && c.zip === m.zip)) combined.push(m);
                                        });
                                        
                                        updateTableData('addresses', combined);
                                        filterTable(getCombinedAddressQuery()); // Nach Daten-Update Filter erneut anwenden
                                    } catch (err) {
                                        console.error("Fehler bei Adress-Suche", err);
                                    }
                                }, 400);
                            }
                        });
                    });
                },
                validate: (res) => {
                    if (!res.name) {
                        window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                        return false;
                    }
                    return true;
                }
            });

            if (result) {
                callback({ name: result.name, templateId: result.id, address: { street: result.street, number: result.number, zip: result.zip, city: result.city, country: result.country }});
            }
        } else {
            // Für Stockwerke & Räume
            const tableData = await window.API.getLocationTypes(type) || [];
            
            const result = await window.Dialog.formWithTable({
                title: title,
                searchable: false, // Deaktiviert das redundante Tabellen-Suchfeld (Omni-Search aktiv)
                fields: [
                    { id: 'id', type: 'hidden', value: defaultData.id || '' },
                    { id: 'name', label: 'Name / Bezeichnung *', value: defaultData.name || '', fullWidth: true }
                ],
                tableColumns: [{ key: 'name', label: 'Verfügbare Vorlagen' }],
                tableData: tableData,
                onRowSelect: (row, fields) => { fields.name.value = row.name || ''; fields.id.value = row.id || ''; },
                onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                    // Omni-Search: Filtere die Tabelle basierend auf der Eingabe im Feld "Name"
                    const handleNameInput = (e) => {
                        filterTable(e.target.value);
                    };
                    fields.name.addEventListener('focus', handleNameInput);
                    fields.name.addEventListener('input', handleNameInput);
                },
                validate: (res) => {
                    if (!res.name) {
                        window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                        return false;
                    }
                    return true;
                }
            });

            if (result) callback({ name: result.name, templateId: result.id });
        }
    },

    async loadData() {
        try {
            const [locationsData, devices, sensors, actuators] = await Promise.all([
                window.API.getLocations(),
                window.API.getDevices(),
                window.API.getSensors(),
                window.API.getActuators()
            ]);
            
            this.locations = locationsData;
            if (!this.locations) this.locations = [];
            
            this.devices = devices || []; // Speichern für das spätere Tabellen-Mapping
            
            const d = this.devices.map(x => ({ ...x, dpType: 'Gerät' }));
            const s = (sensors || []).map(x => ({ ...x, dpType: 'Sensor' }));
            const a = (actuators || []).map(x => ({ ...x, dpType: 'Aktor' }));
            this.allDatapoints = [...d, ...s, ...a];
            
            if (this.pendingRoute) {
                this.applyPendingRoute();
            } else {
                this.renderBuildings();
            }
        } catch (err) {
            console.error("Fehler beim Laden der Locations-Struktur:", err);
            this.container.innerHTML = `<p class="page-placeholder error">Fehler beim Laden der Struktur</p>`;
        }
    },

    async saveData() {
        await window.API.saveLocations(this.locations);
    },

    renderBuildings() {
        let html = `
            <div class="breadcrumb">
                <span class="breadcrumb-active">Standorte</span>
                <div style="flex-grow:1"></div>
                <button id="btn-toggle-edit" class="btn-outline ${this.isEditModeBuildings ? 'active' : ''}" title="Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Gebäude bearbeiten</button>
                <button id="btn-add-building" class="btn-outline" title="Gebäude hinzufügen"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Gebäude hinzufügen</button>
            </div>
            <div class="floor-grid ${this.isEditModeBuildings ? 'edit-mode' : ''}">`;
        
        if (!this.locations || this.locations.length === 0) {
            html += `<p style="color: var(--text-secondary);">Keine Gebäude gefunden.</p>`;
        } else {
            this.locations.forEach((building, index) => {
                const floorCount = building.floors ? building.floors.length : 0;
                const addressText = building.address && building.address.street 
                    ? `<span style="display:block; font-size:0.8rem; color:var(--text-muted); margin-top: 5px;">${building.address.street} ${building.address.number}<br>${building.address.zip} ${building.address.city}</span>`
                    : '';
                
                html += `
                    <div class="location-card building-card" data-building="${building.id}" data-index="${index}" ${this.isEditModeBuildings ? 'draggable="true"' : ''}>
                        <div class="card-actions">
                            <button class="btn-icon btn-edit edit-building" data-id="${building.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                            <button class="btn-icon btn-delete delete-building" data-id="${building.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                        </div>
                        <h3>${building.name}</h3>
                        <p>${floorCount} Stockwerke</p>
                        ${addressText}
                        <div style="display:flex; gap:0.5rem; margin-top: 12px; width: 100%;">
                            <button class="btn-show-devices" data-id="${building.id}">
                                Hardware
                            </button>
                            <button class="btn-show-datapoints" data-id="${building.id}">
                                Sensoren / Aktoren
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `</div>`;
        html += `<div id="building-devices-container" style="margin-top: 2rem; width: 100%;"></div>`;
        this.container.innerHTML = html;
        
        document.getElementById('btn-toggle-edit').addEventListener('click', () => {
            this.isEditModeBuildings = !this.isEditModeBuildings;
            this.renderBuildings();
        });

        if (this.isEditModeBuildings) {
            let dragStartIndex = null;
            this.container.querySelectorAll('.building-card').forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    dragStartIndex = parseInt(card.dataset.index);
                    e.dataTransfer.effectAllowed = 'move';
                    card.style.opacity = '0.5';
                });
                card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
                card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });
                card.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');
                    const dragEndIndex = parseInt(card.dataset.index);
                    if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
                        const movedItem = this.locations.splice(dragStartIndex, 1)[0];
                        this.locations.splice(dragEndIndex, 0, movedItem);
                        await this.saveData();
                        this.renderBuildings();
                    }
                });
                card.addEventListener('dragend', () => { card.style.opacity = '1'; });
            });
        }

        document.getElementById('btn-add-building').addEventListener('click', () => {
            this.openModal('building', 'Gebäude hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'building', name: data.name, address: data.address });
                this.locations.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, address: data.address, floors: [] });
                await this.saveData();
                this.renderBuildings();
            });
        });

        this.container.querySelectorAll('.edit-building').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const b = this.locations.find(x => x.id === btn.dataset.id);
                this.openModal('building', 'Gebäude bearbeiten', { name: b.name, address: b.address }, async (data) => {
                    b.name = data.name;
                    b.address = data.address;
                    await this.saveData();
                    this.renderBuildings();
                });
            });
        });

        this.container.querySelectorAll('.delete-building').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Objekt gelöscht werden soll?')) {
                    this.locations = this.locations.filter(x => x.id !== btn.dataset.id);
                    await this.saveData();
                    this.renderBuildings();
                }
            });
        });

        this.container.querySelectorAll('.building-card').forEach(card => {
            card.addEventListener('click', () => {
                const buildingId = card.dataset.building;
                if (window.Router) {
                    window.Router.navigate(`#locations/building/${buildingId}`, { view: 'building', buildingId: buildingId });
                } else {
                    const building = this.locations.find(b => b.id === buildingId);
                    if (building) {
                        this.isEditModeFloors = false;
                        this.isEditModeRooms = false;
                        this.renderBuildingDetails(building);
                    }
                }
            });
        });

        this.container.querySelectorAll('.btn-show-devices').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Verhindert, dass man in den Raum-Detail-Modus wechselt
                const b = this.locations.find(x => x.id === btn.dataset.id);
                if (b) this.renderBuildingDevices(b);
            });
        });

        this.container.querySelectorAll('.btn-show-datapoints').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const b = this.locations.find(x => x.id === btn.dataset.id);
                if (b) this.renderBuildingDatapoints(b);
            });
        });
    },

    renderBuildingDevices(building) {
        const container = document.getElementById('building-devices-container');
        if (!container) return;

        // Sammle alle Namen und IDs, die zu diesem Haus gehören (Haus, Stockwerke, Räume)
        const locationNames = new Set([building.name, building.id]);
        (building.floors || []).forEach(f => {
            locationNames.add(f.name);
            locationNames.add(f.id);
            (f.rooms || []).forEach(r => {
                locationNames.add(r.name);
                locationNames.add(r.id);
            });
        });

        // Filtere alle physischen Hardware-Geräte, die sich im Haus befinden
        const buildingDevices = (this.devices || []).filter(d => locationNames.has(d.location));

        container.innerHTML = `
            <div class="building-devices-section" style="background:var(--bg-base); border:1px solid var(--border-color); border-radius:8px; padding:1.25rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggle-building-devices">
                    <h4 style="margin:0; color:var(--text-primary); font-size:1.05rem;">Zugeordnete Hardware-Geräte in ${building.name} (${buildingDevices.length})</h4>
                    <span id="building-devices-icon" style="color:var(--accent-blue); font-size:1.2rem;">▼</span>
                </div>
                <div id="building-devices-table" style="display:block; margin-top:1rem;">
                    <div id="bldg-table-wrapper"></div>
                </div>
            </div>
        `;

        document.getElementById('toggle-building-devices').addEventListener('click', () => {
            const el = document.getElementById('building-devices-table');
            const icon = document.getElementById('building-devices-icon');
            if (el.style.display === 'none') { el.style.display = 'block'; icon.textContent = '▼'; } 
            else { el.style.display = 'none'; icon.textContent = '▲'; }
        });

        const tableWrapper = document.getElementById('bldg-table-wrapper');
        if (typeof DataTable !== 'undefined' && tableWrapper) {
            const columns = [
                { key: 'id',         label: 'UUID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">${val || '—'}</span>` },
                { key: 'name',       label: 'Gerätename' },
                { key: 'location',   label: 'Standort' },
                { key: 'busType',    label: 'Netzwerk' },
                { key: 'macAddress', label: 'Adresse', render: (val, row) => `<span style="font-family: monospace; color:var(--text-muted);">${val || row.busAddress || '—'}</span>` },
                { key: 'status',     label: 'Status', render: (val) => {
                    if (val === 'active') return `<span style="color:var(--text-success); font-weight:bold;">Aktiv</span>`;
                    if (val === 'searching') return `<span style="color:var(--text-warning); font-weight:bold;">Wird gesucht...</span>`;
                    if (val === 'not_reachable') return `<span style="color:var(--error-red); font-weight:bold;">Offline</span>`;
                    return `<span style="color:var(--text-secondary);">${val || '—'}</span>`;
                }}
            ];
            const dataTable = new DataTable(tableWrapper, columns, { hasAdd: false, hasActions: false, searchable: true });
            dataTable.setData(buildingDevices);
        }
        
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    renderBuildingDatapoints(building) {
        const container = document.getElementById('building-devices-container');
        if (!container) return;

        // Sammle alle Namen und IDs, die zu diesem Haus gehören (Haus, Stockwerke, Räume)
        const locationNames = new Set([building.name, building.id]);
        (building.floors || []).forEach(f => {
            locationNames.add(f.name);
            locationNames.add(f.id);
            (f.rooms || []).forEach(r => {
                locationNames.add(r.name);
                locationNames.add(r.id);
            });
        });

        // Filtere alle Sensoren/Aktoren, die sich im Haus befinden
        const buildingDatapoints = this.allDatapoints.filter(dp => locationNames.has(dp.location) && ['Sensor', 'Aktor'].includes(dp.dpType));

        container.innerHTML = `
            <div class="building-devices-section" style="background:var(--bg-base); border:1px solid var(--border-color); border-radius:8px; padding:1.25rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggle-building-devices">
                    <h4 style="margin:0; color:var(--text-primary); font-size:1.05rem;">Zugeordnete Sensoren & Aktoren in ${building.name} (${buildingDatapoints.length})</h4>
                    <span id="building-devices-icon" style="color:var(--accent-blue); font-size:1.2rem;">▼</span>
                </div>
                <div id="building-devices-table" style="display:block; margin-top:1rem;">
                    <div id="bldg-table-wrapper"></div>
                </div>
            </div>
        `;

        document.getElementById('toggle-building-devices').addEventListener('click', () => {
            const el = document.getElementById('building-devices-table');
            const icon = document.getElementById('building-devices-icon');
            if (el.style.display === 'none') { el.style.display = 'block'; icon.textContent = '▼'; } 
            else { el.style.display = 'none'; icon.textContent = '▲'; }
        });

        const tableWrapper = document.getElementById('bldg-table-wrapper');
        if (typeof DataTable !== 'undefined' && tableWrapper) {
            const columns = [
                { key: 'id',         label: 'UUID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">${val || '—'}</span>` },
                { key: 'name',       label: 'Name' },
                { key: 'dpType',     label: 'Typ', render: (val) => val === 'Sensor' ? `<span style="color:var(--text-success); font-weight:bold;">Sensor</span>` : `<span style="color:var(--text-warning); font-weight:bold;">Aktor</span>` },
                { key: 'deviceName', label: 'Hardware-Gerät', render: (val) => val && val !== '—' ? `<span style="color: var(--accent-blue);">${val}</span>` : '—' },
                { key: 'type',       label: 'Mess-Typ' },
                { key: 'location',   label: 'Standort' },
                { key: 'channel',    label: 'IO-Port', render: (val) => val ? `<span class="io-port io-port--assigned">${val}</span>` : '—' },
                { key: 'value',      label: 'Wert' },
                { key: 'unit',       label: 'Einheit' },
                { key: 'updated',    label: 'Letztes Update' }
            ];

            const dataTable = new DataTable(tableWrapper, columns, { hasAdd: false, hasActions: false, searchable: true });
            const enrichedDevices = buildingDatapoints.map(d => {
                const dev = (this.devices || []).find(devItem => devItem.id === d.deviceId);
                return { ...d, deviceName: dev ? dev.name : '—' };
            });
            dataTable.setData(enrichedDevices);
        }
        
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    renderBuildingDetails(building) {
        const defaultFloor = (building.floors && building.floors.length > 0) ? building.floors[0] : null;
        
        const addressText = building.address && building.address.street 
            ? `<div style="font-size:0.85rem; color:var(--text-muted); font-weight: normal; margin-top: 4px;">${building.address.street} ${building.address.number}, ${building.address.zip} ${building.address.city}</div>`
            : '';

        let html = `
            <div class="breadcrumb" style="align-items:flex-end; flex-wrap:wrap; gap:1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0; margin-bottom: 0;">
                <div style="display:flex; flex-direction:column; margin-bottom: 0.4rem;">
                    <div>
                        <span id="bc-locations" style="cursor:pointer;">Locations</span>
                        <span class="breadcrumb-sep">/</span>
                        <span class="breadcrumb-active">${building.name}</span>
                    </div>
                    ${addressText}
                </div>
        `;

        if (!building.floors) building.floors = [];

        if (building.floors.length === 0) {
            html += `<p style="color: var(--text-secondary); margin:0;">Keine Stockwerke konfiguriert.</p>`;
        } else {
            html += `<div class="tabs-container ${this.isEditModeFloors ? 'edit-mode' : ''}" style="margin:0; padding:0; border-bottom:none; flex-wrap:wrap;">`;
            building.floors.forEach((floor, index) => {
                html += `
                    <div class="tab-wrapper" data-floor="${floor.id}" data-index="${index}" ${this.isEditModeFloors ? 'draggable="true"' : ''}>
                        <button class="tab-button">${floor.name}</button>
                        <button class="btn-icon btn-edit edit-floor" data-id="${floor.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                        <button class="btn-icon btn-delete delete-floor" data-id="${floor.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                    </div>`;
            });
            html += `</div>`;
        }
        
        html += `
                <div style="flex-grow:1"></div>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.4rem;">
                    <button id="btn-toggle-edit" class="btn-outline ${this.isEditModeFloors ? 'active' : ''}" title="Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Stockwerke bearbeiten</button>
                    <button id="btn-add-floor" class="btn-outline" title="Stockwerk/Wohnung hinzufügen"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Stockwerk/Wohnung hinzufügen</button>
                </div>
            </div>
            <div id="rooms-container"></div>
        `;
        
        this.container.innerHTML = html;
        document.getElementById('bc-locations').addEventListener('click', () => {
            if (window.Router) {
                window.Router.navigate('#locations', { view: 'buildings' });
            } else {
                this.renderBuildings();
            }
        });
        
        document.getElementById('btn-toggle-edit').addEventListener('click', () => {
            this.isEditModeFloors = !this.isEditModeFloors;
            this.renderBuildingDetails(building);
        });

        document.getElementById('btn-add-floor').addEventListener('click', () => {
            this.openModal('floor', 'Stockwerk/Wohnung hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'floor', name: data.name, parentId: building.id });
                building.floors.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, rooms: [] });
                await this.saveData();
                this.renderBuildingDetails(building);
            });
        });

        if (building.floors.length > 0) {
            this.container.querySelectorAll('.edit-floor').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const f = building.floors.find(x => x.id === btn.dataset.id);
                    this.openModal('floor', 'Stockwerk/Wohnung bearbeiten', { name: f.name }, async (data) => {
                        f.name = data.name;
                        await this.saveData();
                        this.renderBuildingDetails(building);
                    });
                });
            });

            this.container.querySelectorAll('.delete-floor').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Objekt gelöscht werden soll?')) {
                        building.floors = building.floors.filter(x => x.id !== btn.dataset.id);
                        await this.saveData();
                        this.renderBuildingDetails(building);
                    }
                });
            });

            const tabs = this.container.querySelectorAll('.tab-wrapper[data-floor]');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    if(e.target.tagName === 'BUTTON' && e.target.classList.contains('btn-icon')) return;
                    const floorId = tab.dataset.floor;
                    if (window.Router) {
                        window.Router.navigate(`#locations/building/${building.id}/floor/${floorId}`, { view: 'floor', buildingId: building.id, floorId: floorId });
                    } else {
                        tabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        this.activeFloorId = floorId;
                        const floor = building.floors.find(f => f.id === floorId);
                        if (floor) this.renderRooms(floor, building);
                    }
                });
            });

            let activeFloor = building.floors.find(f => f.id === this.activeFloorId);
            if (!activeFloor && building.floors.length > 0) activeFloor = building.floors[0];
            if (activeFloor) {
                const activeTab = this.container.querySelector(`.tab-wrapper[data-floor="${activeFloor.id}"]`);
                if (activeTab) activeTab.classList.add('active');
                this.renderRooms(activeFloor, building);
            }

            if (this.isEditModeFloors) {
                let dragStartFloor = null;
                this.container.querySelectorAll('.tab-wrapper[data-floor]').forEach(tab => {
                    tab.addEventListener('dragstart', (e) => {
                        dragStartFloor = parseInt(tab.dataset.index);
                        e.dataTransfer.effectAllowed = 'move';
                        tab.style.opacity = '0.5';
                    });
                    tab.addEventListener('dragover', (e) => { e.preventDefault(); tab.classList.add('drag-over'); });
                    tab.addEventListener('dragleave', () => { tab.classList.remove('drag-over'); });
                    tab.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        tab.classList.remove('drag-over');
                        const dragEndFloor = parseInt(tab.dataset.index);
                        if (dragStartFloor !== null && dragStartFloor !== dragEndFloor) {
                            const movedItem = building.floors.splice(dragStartFloor, 1)[0];
                            building.floors.splice(dragEndFloor, 0, movedItem);
                            await this.saveData();
                            this.renderBuildingDetails(building);
                        }
                    });
                    tab.addEventListener('dragend', () => { tab.style.opacity = '1'; });
                });
            }
        }
    },

    renderRooms(floor, building) {
        const roomsContainer = document.getElementById('rooms-container');
        if (!roomsContainer) return;

        if (!floor.rooms) floor.rooms = [];

        let html = `
            <div style="display: flex; align-items: flex-end; flex-wrap: wrap; gap: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0; margin-bottom: 1.5rem; margin-top: 0.5rem;">
                <div style="display:flex; flex-direction:column; margin-bottom: 0.4rem;">
                    <h3 style="color: var(--text-primary); margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">🚪 Räume in ${floor.name}</h3>
                </div>
        `;

        if (floor.rooms.length === 0) {
            html += `<p style="color: var(--text-secondary); margin: 0 0 0.4rem 0;">Keine Räume konfiguriert.</p>`;
        } else {
            html += `<div class="tabs-container ${this.isEditModeRooms ? 'edit-mode' : ''}" style="margin:0; padding:0; border-bottom:none; flex-wrap:wrap;">`;
            floor.rooms.forEach((room, index) => {
                html += `
                    <div class="tab-wrapper" data-room="${room.id}" data-index="${index}" ${this.isEditModeRooms ? 'draggable="true"' : ''}>
                        <button class="tab-button">${room.name}</button>
                        <button class="btn-icon btn-edit edit-room" data-id="${room.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                        <button class="btn-icon btn-delete delete-room" data-id="${room.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                    </div>`;
            });
            html += `</div>`;
        }
        
        html += `
                <div style="flex-grow:1"></div>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.4rem;">
                    <button id="btn-toggle-edit-rooms" class="btn-outline ${this.isEditModeRooms ? 'active' : ''}" title="Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Räume bearbeiten</button>
                    <button id="btn-add-room" class="btn-outline" title="Raum hinzufügen"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Raum hinzufügen</button>
                </div>
            </div>
            <div id="active-room-content"></div>
        `;
        roomsContainer.innerHTML = html;

        if (this.isEditModeRooms) {
            let dragStartRoom = null;
            roomsContainer.querySelectorAll('.tab-wrapper[data-room]').forEach(tab => {
                tab.addEventListener('dragstart', (e) => {
                    dragStartRoom = parseInt(tab.dataset.index);
                    e.dataTransfer.effectAllowed = 'move';
                    tab.style.opacity = '0.5';
                });
                tab.addEventListener('dragover', (e) => { e.preventDefault(); tab.classList.add('drag-over'); });
                tab.addEventListener('dragleave', () => { tab.classList.remove('drag-over'); });
                tab.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    tab.classList.remove('drag-over');
                    const dragEndRoom = parseInt(tab.dataset.index);
                    if (dragStartRoom !== null && dragStartRoom !== dragEndRoom) {
                        const movedItem = floor.rooms.splice(dragStartRoom, 1)[0];
                        floor.rooms.splice(dragEndRoom, 0, movedItem);
                        await this.saveData();
                        this.renderRooms(floor, building);
                    }
                });
                tab.addEventListener('dragend', () => { tab.style.opacity = '1'; });
            });
        }

        document.getElementById('btn-toggle-edit-rooms').addEventListener('click', () => {
            this.isEditModeRooms = !this.isEditModeRooms;
            this.renderRooms(floor, building);
        });

        document.getElementById('btn-add-room').addEventListener('click', () => {
            this.openModal('room', 'Raum hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'room', name: data.name, parentId: floor.id });
                floor.rooms.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name });
                await this.saveData();
                this.renderRooms(floor, building);
            });
        });

        roomsContainer.querySelectorAll('.edit-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const r = floor.rooms.find(x => x.id === btn.dataset.id);
                this.openModal('room', 'Raum bearbeiten', { name: r.name }, async (data) => {
                    r.name = data.name;
                    await this.saveData();
                    this.renderRooms(floor, building);
                });
            });
        });

        roomsContainer.querySelectorAll('.delete-room').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Objekt gelöscht werden soll?')) {
                    floor.rooms = floor.rooms.filter(x => x.id !== btn.dataset.id);
                    await this.saveData();
                    this.renderRooms(floor, building);
                }
            });
        });

        const roomTabs = roomsContainer.querySelectorAll('.tab-wrapper[data-room]');
        roomTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                if(e.target.tagName === 'BUTTON' && e.target.classList.contains('btn-icon')) return;
                const roomId = tab.dataset.room;
                if (window.Router) {
                    window.Router.navigate(`#locations/building/${building.id}/floor/${floor.id}/room/${roomId}`, { view: 'room', buildingId: building.id, floorId: floor.id, roomId: roomId });
                } else {
                    roomTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.activeRoomId = roomId;
                    const room = floor.rooms.find(r => r.id === roomId);
                    if (room) this.renderRoomDetails(room, floor, building);
                }
            });
        });

        // Standardmäßig den zuletzt geöffneten oder den ersten Raum anwählen
        let activeRoom = floor.rooms.find(r => r.id === this.activeRoomId);
        if (!activeRoom && floor.rooms.length > 0) activeRoom = floor.rooms[0];
        if (activeRoom) {
            const activeTab = roomsContainer.querySelector(`.tab-wrapper[data-room="${activeRoom.id}"]`);
            if (activeTab) activeTab.classList.add('active');
            this.renderRoomDetails(activeRoom, floor, building);
        }
    },

    renderRoomDetails(room, floor, building) {
        const detailsContainer = document.getElementById('active-room-content');
        if (!detailsContainer) return;

        // STRIKTER FILTER: Nur echte Sensoren und Aktoren ausgeben. Verhindert Geister-Geräte!
        const assignedDatapoints = this.allDatapoints.filter(dp => (dp.location === room.name || dp.location === room.id) && ['Sensor', 'Aktor'].includes(dp.dpType));

        detailsContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <h3 style="color:var(--text-primary); margin:0; font-size:1.2rem;">Dashboard: ${room.name}</h3>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button id="room-edit-mode-btn" class="btn-outline" title="Kachel-Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Kachel bearbeiten</button>
                    <button id="room-add-tile-btn" class="btn-outline" title="Kachel hinzufügen"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Kachel hinzufügen</button>
                </div>
            </div>
            <div id="room-dashboard-grid" class="overview-container" style="background:transparent; border:none; padding:0;"></div>
        `;

        // Instanziiere den TileManager für DIESEN Raum
        if (typeof window.TileManager !== 'undefined') {
            this.roomDashboard = window.TileManager.createInstance({
                container: '#room-dashboard-grid',
                storageKey: `dashboard_room_${room.id}`, // Jeder Raum speichert sein Layout separat!
                editBtn: '#room-edit-mode-btn',
                addBtn: '#room-add-tile-btn',
                allowedDatapoints: assignedDatapoints.map(d => d.id) // Nur Sensoren/Aktoren dieses Raums zulassen!
            });
            this.roomDashboard.init();
        }
    }
};
window.LocationsManager = LocationsManager;