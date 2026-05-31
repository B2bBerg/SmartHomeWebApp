/**
 * locations.js – Grafische Kachel-Darstellung der Gebäude-Struktur
 */
const LocationsManager = {
    init() {
        this.container = document.getElementById('locations-container');
        if (!this.container) return;
        this.isEditModeTree = false;
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

        // Wenn ein "state" vom Router kommt (z.B. via Browser-History), wird dieser bevorzugt
        if (state && Object.keys(state).length > 0 && state.view) {
            this.restoreState(state);
            return;
        }

        // URL Parsen (Fallback für direkte Bookmarks/Reloads der Seite)
        if (pathParts.length >= 3 && pathParts[1] === 'building') {
            this.renderBuildingDetail(pathParts[2], pathParts[4], pathParts[6]);
        } else {
            this.renderBuildings();
        }
    },

    restoreState(state) {
        if (!state || !this.locations) return;

        if (state.view === 'building' || state.view === 'floor' || state.view === 'room') {
            this.renderBuildingDetail(state.buildingId, state.floorId, state.roomId);
        } else {
            this.renderBuildings();
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
                if (l.address && l.address.street && !existingAddresses.find(a => a.street === l.address.street && a.zip_code === l.address.zip_code)) {
                    existingAddresses.push(l.address);
                }
            });

            const result = await window.Dialog.formWithTable({
                title: title,
                searchable: false, // Deaktiviert das redundante Tabellen-Suchfeld (Omni-Search aktiv)
                fields: [
                    { id: 'addressId', type: 'hidden', value: addr.id || '' },
                    { id: 'templateId', type: 'hidden', value: defaultData.id || '' },
                    { id: 'templateSearch', label: 'Gebäude-Typ suchen *', placeholder: 'Tippen und aus Tabelle wählen...', fullWidth: true },
                    { id: 'name', label: 'Gebäude Name *', value: defaultData.name || '', fullWidth: true },
                    { id: 'street', label: 'Strasse *', value: addr.street || '' },
                    { id: 'street_number', label: 'Hausnummer', value: addr.street_number || '' },
                    { id: 'zip_code', label: 'PLZ *', value: addr.zip_code || '' },
                    { id: 'city', label: 'Ort *', type: 'select', options: [{ value: addr.city || '', label: addr.city || '-- Bitte wählen --' }] },
                    { id: 'country', label: 'Land', value: addr.country || 'Schweiz', fullWidth: true }
                ],
                tables: [
                    {
                        id: 'templates',
                        title: '📋 Gebäude-Typen',
                        columns: [{ key: 'name', label: 'Verfügbare Haus-Typen' }],
                        data: templates,
                        onRowSelect: (row, fields) => {
                            fields.templateSearch.value = row.name || '';
                            fields.templateId.value = row.id || '';
                        }
                    },
                    {
                        id: 'addresses',
                        title: '📍 Adress-Datenbank',
                        columns: [
                            { key: 'street', label: 'Strasse', render: (v) => v || '—' },
                            { key: 'street_number', label: 'Nummer', render: (v) => v || '—' },
                            { key: 'zip_code', label: 'PLZ', render: (v) => v || '—' },
                            { key: 'city', label: 'Ort', render: (v) => v || '—' },
                            { key: 'country', label: 'Land', render: (v) => v || 'Schweiz' }
                        ],
                        data: existingAddresses,
                        onRowSelect: (row, fields) => {
                            fields.street.value = row.street || '';
                            fields.street_number.value = row.street_number || '';
                            fields.zip_code.value = row.zip_code || '';
                            
                            // Da das Feld nun ein Select ist, stellen wir sicher, dass die Option existiert, bevor wir den Wert setzen
                            let exists = Array.from(fields.city.options).some(opt => opt.value === row.city);
                            if (!exists && row.city) {
                                const opt = document.createElement('option');
                                opt.value = row.city;
                                opt.textContent = row.city;
                                fields.city.appendChild(opt);
                            }
                            fields.city.value = row.city || '';
                            fields.country.value = row.country || 'Schweiz';
                            fields.addressId.value = row.id || '';
                        }
                    }
                ],
                onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                    // Automatische PLZ Auflösung einhängen
                    fields.zip_code.addEventListener('blur', async () => {
                        if (fields.zip_code.value.length >= 4 && window.API.lookupCityByZip) {
                            const cities = await window.API.lookupCityByZip(fields.zip_code.value, fields.country.value);
                            if (cities && cities.length > 0) {
                                fields.city.innerHTML = ''; // Vorherige Suchergebnisse löschen
                                
                                cities.forEach(c => {
                                    const opt = document.createElement('option');
                                    opt.value = c;
                                    opt.textContent = c;
                                    fields.city.appendChild(opt);
                                });
                                
                                fields.city.value = cities[0]; // Setzt weiterhin den ersten Treffer als Standard
                                
                                // Falls mehrere Orte gefunden wurden: Setze den Fokus auf das Feld, 
                                // um dem User zu signalisieren, dass er aus dem Dropdown wählen kann.
                                if (cities.length > 1) fields.city.focus();
                            }
                        }
                    });
                    
                    const addressFields = [fields.street, fields.street_number, fields.zip_code, fields.city, fields.country];
                    let searchTimeout;

                    const handleTemplateSearch = (e) => {
                        fields.templateId.value = ''; // ID zurücksetzen bei manueller Eingabe
                        switchToTab('templates');
                        filterTable(e.target.value);
                    };
                    fields.templateSearch.addEventListener('focus', handleTemplateSearch);
                    fields.templateSearch.addEventListener('input', handleTemplateSearch);

                    // Baut einen kombinierten Suchstring aus allen Adress-Feldern
                    const getCombinedAddressQuery = () => {
                        return `${fields.street.value} ${fields.street_number.value} ${fields.zip_code.value} ${fields.city.value}`.trim();
                    };

                    addressFields.forEach(f => {
                        f.addEventListener('focus', (e) => {
                            switchToTab('addresses');
                            filterTable(getCombinedAddressQuery());
                        });

                        f.addEventListener('input', (e) => {
                            fields.addressId.value = ''; // Reset ID so manual typing creates a new DB record
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
                                            if (!combined.find(c => c.street === m.street && c.zip_code === m.zip_code)) combined.push(m);
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
                    if (!res.name || !res.street || !res.zip_code || !res.city) {
                        window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                        return false;
                    }
                    if (!res.templateId) {
                        window.Dialog.alert('Typ fehlt', 'Bitte wählen Sie unten aus dem Register (Tab) "Gebäude-Typen" einen Typ aus.', true);
                        return false;
                    }
                    return true;
                }
            });

            if (result) {
                callback({ name: result.name, templateId: result.templateId, address: { id: result.addressId || undefined, street: result.street, street_number: result.street_number, zip_code: result.zip_code, city: result.city, country: result.country }});
            }
        } else if (type === 'appartment') {
            // Für Wohnungen (Appartments) mit Metadaten
            const [appartmentTypes, floorTypes, roomCountTypes] = await Promise.all([
                window.API.getLocationTypes('appartment'),
                window.API.getLocationTypes('floor'),
                window.API.getLocationTypes('room_count')
            ]);
            
            const roomCountOptions = (roomCountTypes || []).map(t => ({ value: t.name, label: t.name + ' Zimmer' }));
            roomCountOptions.unshift({ value: '', label: '-- Keine Angabe --' });

            const result = await window.Dialog.formWithTable({
                title: title,
                searchable: false,
                fields: [
                    { id: 'templateId', type: 'hidden', value: defaultData.id || '' },
                    { id: 'templateSearch', label: 'Wohnungs-Typ suchen *', placeholder: 'Tippen und aus Tabelle wählen...', fullWidth: true },
                    { id: 'floor_level', label: 'Etage suchen (Optional)', placeholder: 'Tippen und unten wählen...', value: defaultData.metadata?.floor_level || '' },
                    { id: 'rooms_count', label: 'Zimmerzahl', type: 'select', options: roomCountOptions, value: defaultData.metadata?.rooms_count || '' }
                ],
                tables: [
                    {
                        id: 'templates',
                        title: '📋 Wohnungs-Typen',
                        columns: [{ key: 'name', label: 'Verfügbare Typen' }],
                        data: appartmentTypes || [],
                        onRowSelect: (row, fields) => {
                            fields.templateSearch.value = row.name || '';
                            fields.templateId.value = row.id || '';
                        }
                    },
                    {
                        id: 'floors',
                        title: '🏢 Etagen',
                        columns: [{ key: 'name', label: 'Verfügbare Etagen' }],
                        data: floorTypes || [],
                        onRowSelect: (row, fields) => {
                            fields.floor_level.value = row.name || '';
                        }
                    }
                ],
                onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                    const handleTemplateSearch = (e) => {
                        fields.templateId.value = '';
                        switchToTab('templates');
                        filterTable(e.target.value);
                    };
                    fields.templateSearch.addEventListener('focus', handleTemplateSearch);
                    fields.templateSearch.addEventListener('input', handleTemplateSearch);

                    const handleFloorSearch = (e) => {
                        switchToTab('floors');
                        filterTable(e.target.value);
                    };
                    fields.floor_level.addEventListener('focus', handleFloorSearch);
                    fields.floor_level.addEventListener('input', handleFloorSearch);
                },
                validate: (res) => {
                    if (!res.templateId) {
                        window.Dialog.alert('Typ fehlt', 'Bitte wählen Sie den Wohnungs-Typ unten aus der Tabelle aus.', true);
                        return false;
                    }
                    return true;
                }
            });

            if (result) {
                const selectedTemplate = (appartmentTypes || []).find(t => t.id === result.templateId);
                let autoName = selectedTemplate ? selectedTemplate.name : 'Wohnung';
                const finalName = autoName;

                callback({ name: finalName, templateId: result.templateId, metadata: {
                    floor_level: result.floor_level || null,
                    rooms_count: result.rooms_count || null
                }});
            }
        } else if (type === 'room') {
            // Für Räume mit Raumnummer (Metadaten)
            const tableData = await window.API.getLocationTypes('room') || [];
            
            const result = await window.Dialog.formWithTable({
                title: title,
                searchable: false,
                fields: [
                    { id: 'templateId', type: 'hidden', value: defaultData.id || '' },
                    { id: 'templateSearch', label: 'Raum-Typ suchen *', placeholder: 'Tippen und aus Tabelle wählen...', fullWidth: true },
                    { id: 'room_number', label: 'Raumnummer (Optional)', type: 'text', placeholder: 'z.B. 101', value: defaultData.metadata?.room_number || '' }
                ],
                tables: [
                    {
                        id: 'templates',
                        title: '📋 Raum-Typen',
                        columns: [{ key: 'name', label: 'Verfügbare Vorlagen' }],
                        data: tableData || [],
                        onRowSelect: (row, fields) => {
                            fields.templateSearch.value = row.name || '';
                            fields.templateId.value = row.id || '';
                        }
                    }
                ],
                onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                    const handleTemplateSearch = (e) => {
                        fields.templateId.value = '';
                        switchToTab('templates');
                        filterTable(e.target.value);
                    };
                    fields.templateSearch.addEventListener('focus', handleTemplateSearch);
                    fields.templateSearch.addEventListener('input', handleTemplateSearch);
                },
                validate: (res) => {
                    if (!res.templateId) {
                        window.Dialog.alert('Vorlage fehlt', 'Bitte wählen Sie unten in der Tabelle eine Raum-Vorlage aus.', true);
                        return false;
                    }
                    return true;
                }
            });

            if (result) {
                const selectedTemplate = tableData.find(t => t.id === result.templateId);
                let autoName = selectedTemplate ? selectedTemplate.name : 'Raum';
                if (result.room_number && result.room_number.trim() !== '') {
                    autoName += ` ${result.room_number.trim()}`;
                }
                const finalName = autoName;
                callback({ name: finalName, templateId: result.templateId, metadata: { room_number: result.room_number || null } });
            }
        } else {
            // Für Stockwerke
            const tableData = await window.API.getLocationTypes(type) || [];
            
            const result = await window.Dialog.formWithTable({
                title: title,
                searchable: false, // Deaktiviert das redundante Tabellen-Suchfeld (Omni-Search aktiv)
                fields: [
                    { id: 'templateId', type: 'hidden', value: defaultData.id || '' },
                    { id: 'templateSearch', label: 'Stockwerks-Typ suchen *', placeholder: 'Tippen und unten wählen...', fullWidth: true }
                ],
                tables: [
                    {
                        id: 'templates',
                        title: '📋 Stockwerks-Typen',
                        columns: [{ key: 'name', label: 'Verfügbare Vorlagen' }],
                        data: tableData || [],
                        onRowSelect: (row, fields) => {
                            fields.templateSearch.value = row.name || '';
                            fields.templateId.value = row.id || '';
                        }
                    }
                ],
                onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                    const handleTemplateSearch = (e) => {
                        fields.templateId.value = '';
                        switchToTab('templates');
                        filterTable(e.target.value);
                    };
                    fields.templateSearch.addEventListener('focus', handleTemplateSearch);
                    fields.templateSearch.addEventListener('input', handleTemplateSearch);
                },
                validate: (res) => {
                    if (!res.templateId) {
                        window.Dialog.alert('Vorlage fehlt', 'Bitte wählen Sie unten aus der Tabelle einen Stockwerks-Typ aus.', true);
                        return false;
                    }
                    return true;
                }
            });

            if (result) {
                const selectedTemplate = tableData.find(t => t.id === result.templateId);
                const finalName = selectedTemplate ? selectedTemplate.name : 'Standort';
                callback({ name: finalName, templateId: result.templateId });
            }
        }
    },

    async loadData() {
        try {
            const [locationsData, devices, sensors, actuators] = await Promise.all([
                window.API.getLocations(),
                window.API.getDevices().catch(err => { console.warn("Geräte-API noch nicht bereit:", err); return []; }),
                window.API.getSensors().catch(err => { console.warn("Sensoren-API noch nicht bereit:", err); return []; }),
                window.API.getActuators().catch(err => { console.warn("Aktoren-API noch nicht bereit:", err); return []; })
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
        try {
            await window.API.saveLocations(this.locations);
        } catch (err) {
            console.error("Fehler beim Speichern der Locations:", err);
            if (window.Dialog) window.Dialog.alert('Speicherfehler', 'Die Standorte konnten nicht gespeichert werden: ' + err.message, true);
        }
    },

    renderBuildings() {
        this.activeSelection = null; // Sehr wichtig: Verhindert Router-Endlosschleifen beim Zurück-Navigieren

        this.container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                <h1 style="margin:0; color:var(--text-primary); font-size:1.8rem;">Standorte</h1>
                <button id="btn-add-building" class="btn-add" title="Gebäude hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Gebäude hinzufügen</button>
            </div>
            <div class="floor-grid"></div>
            <div id="building-devices-container" style="margin-top: 2rem; width: 100%;"></div>
        `;

        const grid = this.container.querySelector('.floor-grid');
        
        if (!this.locations || this.locations.length === 0) {
            grid.innerHTML = `<p class="page-placeholder" style="grid-column: 1 / -1;">Keine Gebäude erfasst.</p>`;
        } else {
            this.locations.forEach(building => {
                const floorCount = building.floors ? building.floors.length : 0;
                const addressText = building.address && building.address.street 
                    ? `<span style="display:block; font-size:0.85rem; color:var(--text-muted); margin-top: 5px;">${building.address.street} ${building.address.street_number}<br>${building.address.zip_code} ${building.address.city}</span>`
                    : '';
                
                const card = document.createElement('div');
                card.className = 'location-card building-card';
                card.innerHTML = `
                    <h3>${building.name}</h3>
                    <p>${floorCount} Stockwerke</p>
                    ${addressText}
                    <div style="display:flex; gap:0.5rem; margin-top: 12px; width: 100%; flex-wrap: wrap;">
                        <button class="btn-outline btn-show-devices" data-id="${building.id}" style="flex:1; justify-content:center; width:100%; min-width:120px;">
                            Hardware
                        </button>
                        <button class="btn-outline btn-show-datapoints" data-id="${building.id}" style="flex:1; justify-content:center; width:100%; min-width:120px;">
                            Sensoren / Aktoren
                        </button>
                    </div>
                `;
                card.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return; // Klicks auf Buttons abfangen
                    if (window.Router) window.Router.navigate(`#locations/building/${building.id}`);
                });
                grid.appendChild(card);
            });
        }

        this.container.querySelectorAll('.btn-show-devices').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
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

        document.getElementById('btn-add-building').addEventListener('click', () => {
            this.openModal('building', 'Gebäude hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'building', locationTypeId: data.templateId, name: data.name, address: data.address });
                this.locations.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, address: data.address, floors: [] });
                await this.saveData();
                this.renderBuildings();
            });
        });
    },

    renderBuildingDevices(building) {
        const container = document.getElementById('building-devices-container');
        if (!container) return;

        // Sammle alle IDs, die zu diesem Haus gehören (Haus, Stockwerke, Räume)
        const locationIds = new Set([building.id]);
        (building.floors || []).forEach(f => {
            locationIds.add(f.id);
            (f.rooms || []).forEach(r => {
                locationIds.add(r.id);
            });
        });

        // Filtere alle physischen Hardware-Geräte, die sich im Haus befinden
        const buildingDevices = (this.devices || []).filter(d => locationIds.has(d.location_id));

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
                { key: 'locationName',   label: 'Standort' },
                { key: 'busTypeName',    label: 'Netzwerk' },
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

        // Sammle alle IDs, die zu diesem Haus gehören
        const locationIds = new Set([building.id]);
        (building.floors || []).forEach(f => {
            locationIds.add(f.id);
            (f.rooms || []).forEach(r => {
                locationIds.add(r.id);
            });
        });

        // Filtere alle Sensoren/Aktoren, die sich im Haus befinden anhand der Location UUID
        const buildingDatapoints = (this.allDatapoints || []).filter(dp => locationIds.has(dp.locationId) && ['Sensor', 'Aktor'].includes(dp.dpType));

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
                { key: 'value',      label: 'Wert/Zustand', render: (val, row) => val !== undefined ? val : (row.state !== undefined ? row.state : '—') },
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

    renderBuildingDetail(buildingId, floorId = null, roomId = null) {
        const building = this.locations.find(b => b.id === buildingId);
        if (!building) {
            this.container.innerHTML = `
                <div style="text-align: center; margin-top: 4rem;">
                    <p class="page-placeholder error" style="margin-bottom: 1rem;">Gebäude nicht gefunden.</p>
                    <button id="back-to-locs" class="btn-outline" style="margin: 0 auto;">Zurück zur Übersicht</button>
                </div>
            `;
            document.getElementById('back-to-locs').onclick = () => { if (window.Router) window.Router.navigate('#locations'); };
            return;
        }

        this.container.innerHTML = `
            <div style="display: flex; height: calc(100vh - 120px); margin: -2rem;">
                <!-- Linkes Menü (Tree) -->
                <div id="locations-tree-container" style="width: 280px; background: var(--bg-mantle); border-right: 1px solid var(--border-color); overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; flex-shrink: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: opacity 0.2s;" id="breadcrumb-back" title="Zur Gebäudeübersicht" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                            <img src="assets/icons/arrow-narrow-left-alignment-svgrepo-com.svg" style="width:20px; height:20px; filter:invert(0.5);" alt="back">
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">${building.name}</h3>
                        </div>
                        <div style="display: flex; gap: 0.25rem;">
                            <button id="btn-edit-tree" class="btn-icon" title="Struktur bearbeiten" style="background:${this.isEditModeTree ? 'var(--palette-surface0)' : 'none'};border:none;cursor:pointer;opacity:${this.isEditModeTree ? '1' : '0.8'};border-radius:4px;transition:opacity 0.2s;"><img src="assets/icons/gear-svgrepo-com.svg" style="width:20px;height:20px;filter:invert(1);" alt="edit"></button>
                        </div>
                    </div>
                    <div id="locations-tree" style="flex: 1;"></div>
                </div>
                <!-- Content / Dashboard -->
                <div id="locations-content" style="flex: 1; overflow-y: auto; padding: 2rem; background: var(--bg-base);">
                    <p class="page-placeholder">Bitte wählen Sie links einen Standort aus.</p>
                </div>
            </div>
        `;

        document.getElementById('breadcrumb-back').onclick = () => {
            this.activeSelection = null;
            if (window.Router) window.Router.navigate('#locations');
        };

        document.getElementById('btn-edit-tree').addEventListener('click', (e) => {
            this.isEditModeTree = !this.isEditModeTree;
            const btn = e.currentTarget;
            if (this.isEditModeTree) {
                btn.style.opacity = '1';
                btn.style.background = 'var(--palette-surface0)';
            } else {
                btn.style.opacity = '0.8';
                btn.style.background = 'none';
            }
            this.renderTree(building);
        });

        // 1. Zuerst den Baum (nur für dieses Gebäude!) rendern
        this.renderTree(building);

        // 2. Danach das angefragte Dashboard laden
        // WICHTIG: skipNavigation = true, weil der Router dies bereits veranlasst hat!
        if (roomId) {
            this.selectLocation('room', roomId, true);
        } else if (floorId) {
            this.selectLocation('floor', floorId, true);
        } else {
            this.selectLocation('building', buildingId, true);
        }
    },

    renderTree(currentBuilding = null) {
        const treeContainer = document.getElementById('locations-tree');
        if (!treeContainer) return;

        let html = `<div class="tree-root">`;

        if (currentBuilding) {
            html += this.buildTreeNode(currentBuilding, 'building', {}, 0);
        } else {
            html += `<p style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">Kein Gebäude gewählt.</p>`;
        }
        html += `</div>`;
        treeContainer.innerHTML = html;

        treeContainer.querySelectorAll('.tree-node').forEach(node => {
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = node.dataset.type;
                const id = node.dataset.id;
                this.selectLocation(type, id); // Hier darf der Router aktiv werden!
            });
            node.addEventListener('mouseenter', () => {
                if (!node.classList.contains('active')) node.style.background = 'var(--palette-surface0)';
            });
            node.addEventListener('mouseleave', () => {
                if (!node.classList.contains('active')) node.style.background = 'transparent';
            });
        });

        if (this.isEditModeTree) {
            let dragSource = null;
            treeContainer.querySelectorAll('.tree-node').forEach(node => {
                node.setAttribute('draggable', 'true');
                
                node.addEventListener('dragstart', (e) => {
                    dragSource = {
                        type: node.dataset.type,
                        id: node.dataset.id,
                        parentId: node.dataset.parent,
                        index: parseInt(node.dataset.index)
                    };
                    e.dataTransfer.effectAllowed = 'move';
                    node.style.opacity = '0.5';
                });
                
                node.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!dragSource || dragSource.type !== node.dataset.type || dragSource.parentId !== node.dataset.parent) return;
                    node.classList.add('drag-over');
                });
                
                node.addEventListener('dragleave', () => {
                    node.classList.remove('drag-over');
                });
                
                node.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    node.classList.remove('drag-over');
                    if (!dragSource || dragSource.type !== node.dataset.type || dragSource.parentId !== node.dataset.parent) return;
                    
                    const targetIndex = parseInt(node.dataset.index);
                    if (dragSource.index !== targetIndex) {
                        let arrayToReorder = null;
                        if (dragSource.type === 'building') {
                            arrayToReorder = this.locations;
                        } else if (dragSource.type === 'floor') {
                            const b = this.locations.find(b => b.id === dragSource.parentId);
                            if (b) arrayToReorder = b.floors;
                        } else if (dragSource.type === 'room') {
                            const b = this.locations.find(b => b.floors && b.floors.some(f => f.id === dragSource.parentId));
                            if (b) {
                                const f = b.floors.find(f => f.id === dragSource.parentId);
                                if (f) arrayToReorder = f.rooms;
                            }
                        }
                        if (arrayToReorder) {
                            const movedItem = arrayToReorder.splice(dragSource.index, 1)[0];
                            arrayToReorder.splice(targetIndex, 0, movedItem);
                            await this.saveData();
                            this.renderTree(currentBuilding);
                        }
                    }
                });
                node.addEventListener('dragend', () => node.style.opacity = '1');
            });
        }

        // Event-Listener für die neuen "+ Stockwerk" / "+ Raum" Buttons im Baum
        treeContainer.querySelectorAll('.tree-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const parentId = btn.dataset.parent;
                
                if (action === 'add-floor') {
                    const building = this.locations.find(b => b.id === parentId);
                    if (building) {
                        this.openModal('floor', 'Stockwerk hinzufügen', { name: '' }, async (data) => {
                            const res = await window.API.addLocation({ type: 'floor', locationTypeId: data.templateId, name: data.name, parentId: building.id });
                            if (!building.floors) building.floors = [];
                            building.floors.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, rooms: [] });
                            await this.saveData();
                            this.renderTree(currentBuilding);
                        });
                    }
                } else if (action === 'add-room') {
                    const buildingId = btn.dataset.building;
                    const building = this.locations.find(b => b.id === buildingId);
                    const floor = building?.floors.find(f => f.id === parentId);
                    if (floor) {
                        this.openModal('room', 'Raum hinzufügen', { name: '' }, async (data) => {
                            const res = await window.API.addLocation({ type: 'room', locationTypeId: data.templateId, name: data.name, parentId: floor.id, metadata: data.metadata });
                            if (!floor.rooms) floor.rooms = [];
                            floor.rooms.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, metadata: data.metadata });
                            await this.saveData();
                            this.renderTree(currentBuilding);
                        });
                    }
                }
            });
        });

        if (this.activeSelection) {
            this.updateTreeSelection(this.activeSelection.id);
        }
    },

    buildTreeNode(location, type, parentData = {}, index = 0) {
        let childrenHtml = '';
        if (type === 'building') {
            if (location.floors) {
                location.floors.forEach((f, i) => childrenHtml += this.buildTreeNode(f, 'floor', { buildingId: location.id }, i));
            }
            childrenHtml += `
                <div class="tree-add-btn" data-action="add-floor" data-parent="${location.id}">
                    <span style="margin-right: 6px; font-size: 1.1rem; font-weight: bold;">+</span> Stockwerk
                </div>
            `;
        } else if (type === 'floor') {
            if (location.rooms) {
                location.rooms.forEach((r, i) => childrenHtml += this.buildTreeNode(r, 'room', { buildingId: parentData.buildingId, floorId: location.id }, i));
            }
            childrenHtml += `
                <div class="tree-add-btn" data-action="add-room" data-parent="${location.id}" data-building="${parentData.buildingId}">
                    <span style="margin-right: 6px; font-size: 1.1rem; font-weight: bold;">+</span> Raum
                </div>
            `;
        }

        const fontWeight = type === 'building' ? 'bold' : 'normal';
        
        let parentId = '';
        if (type === 'floor') parentId = parentData.buildingId || '';
        if (type === 'room') parentId = parentData.floorId || '';
        
        let dragIcon = this.isEditModeTree ? `<span style="opacity: 0.5; margin-right: 4px; font-size: 14px; cursor: grab;">≡</span>` : '';

        return `
            <div class="tree-item">
                <div class="tree-node" data-type="${type}" data-id="${location.id}" data-parent="${parentId}" data-index="${index}" style="cursor: pointer; padding: 0.4rem 0.5rem; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; margin: 2px 0;">
                    ${dragIcon}<span class="tree-node-label" style="color: var(--text-primary); font-size: 0.95rem; font-weight: ${fontWeight};">${location.name}</span>
                </div>
                ${childrenHtml ? `<div class="tree-children">${childrenHtml}</div>` : ''}
            </div>
        `;
    },

    updateTreeSelection(id) {
        const treeContainer = document.getElementById('locations-tree');
        if (!treeContainer) return;

        treeContainer.querySelectorAll('.tree-node').forEach(el => {
            el.classList.remove('active');
            el.style.background = 'transparent';
            el.querySelector('.tree-node-label').style.color = 'var(--text-primary)';
        });

        const activeNode = treeContainer.querySelector(`.tree-node[data-id="${id}"]`);
        if (activeNode) {
            activeNode.classList.add('active');
            activeNode.style.background = 'var(--palette-surface1)';
            activeNode.querySelector('.tree-node-label').style.color = 'var(--accent-blue)';
        }
    },

    selectLocation(type, id, skipNavigation = false) {
        this.activeSelection = { type, id };
        this.updateTreeSelection(id);
        
        let building, floor, room;
        if (type === 'building') {
            building = this.locations.find(b => b.id === id);
            if (!skipNavigation && window.Router) window.Router.navigate(`#locations/building/${id}`, { view: 'building', buildingId: id });
            if (building) this.renderBuildingDashboard(building);
        } else if (type === 'floor') {
            building = this.locations.find(b => b.floors?.some(f => f.id === id));
            floor = building?.floors.find(f => f.id === id);
            if (!skipNavigation && window.Router && building) window.Router.navigate(`#locations/building/${building.id}/floor/${id}`, { view: 'floor', buildingId: building.id, floorId: id });
            if (floor) this.renderFloorDashboard(floor, building);
        } else if (type === 'room') {
            building = this.locations.find(b => b.floors?.some(f => f.rooms?.some(r => r.id === id)));
            floor = building?.floors.find(f => f.rooms?.some(r => r.id === id));
            room = floor?.rooms.find(r => r.id === id);
            if (!skipNavigation && window.Router && building && floor) window.Router.navigate(`#locations/building/${building.id}/floor/${floor.id}/room/${id}`, { view: 'room', buildingId: building.id, floorId: floor.id, roomId: id });
            if (room) this.renderRoomDashboard(room, floor, building);
        }
    },

    renderBuildingDashboard(building) {
        const content = document.getElementById('locations-content');
        if (!content) return;

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem;">
                <div>
                    <h2 style="margin:0; color:var(--text-primary); font-size:1.6rem; margin-bottom: 0.2rem;">${building.name}</h2>
                    ${building.address && building.address.street ? `<div style="font-size:0.85rem; color:var(--text-muted);"><span style="opacity:0.7;">📍</span> ${building.address.street} ${building.address.street_number}, ${building.address.zip_code} ${building.address.city}</div>` : ''}
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button id="btn-edit-building" class="btn-icon" title="Gebäude bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                    <button id="btn-delete-building" class="btn-icon" title="Gebäude löschen"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                    <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 0.5rem;"></div>
                    <button id="btn-add-floor" class="btn-add" title="Stockwerk hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Etage hinzufügen</button>
                    <button id="btn-add-appartment" class="btn-add" title="Wohnung hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Wohnung hinzufügen</button>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; margin-bottom:1rem;">
                <h3 style="color:var(--text-primary); margin:0; font-size:1.1rem; font-weight:normal;">Übersicht: ${building.name}</h3>
                <div style="display:flex; gap:0.5rem;">
                    <button id="building-edit-mode-btn" class="btn-outline" title="Kachel-Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Kachel bearbeiten</button>
                    <button id="building-add-tile-btn" class="btn-add" title="Kachel hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Kachel hinzufügen</button>
                </div>
            </div>
            <div id="building-dashboard-grid" class="overview-container" style="background:transparent; border:none; padding:0;"></div>
        `;
        content.innerHTML = html;

        document.getElementById('btn-edit-building').addEventListener('click', () => {
            this.openModal('building', 'Gebäude bearbeiten', { id: building.locationTypeId, name: building.name, address: building.address }, async (data) => {
                building.name = data.name;
                building.address = data.address;
                if (data.templateId) building.locationTypeId = data.templateId;
                await this.saveData();
                this.renderTree();
                this.renderBuildingDashboard(building);
            });
        });

        document.getElementById('btn-delete-building').addEventListener('click', async () => {
            if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Gebäude gelöscht werden soll?')) {
                this.locations = this.locations.filter(x => x.id !== building.id);
                await this.saveData();
                this.activeSelection = null;
                this.renderLayout();
            }
        });

        document.getElementById('btn-add-floor').addEventListener('click', () => {
            this.openModal('floor', 'Stockwerk hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'floor', locationTypeId: data.templateId, name: data.name, parentId: building.id });
                if (!building.floors) building.floors = [];
                building.floors.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, rooms: [] });
                await this.saveData();
                this.renderTree();
            });
        });

        document.getElementById('btn-add-appartment').addEventListener('click', () => {
            this.openModal('appartment', 'Wohnung hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'appartment', locationTypeId: data.templateId, name: data.name, parentId: building.id, metadata: data.metadata });
                if (!building.floors) building.floors = [];
                building.floors.push({ id: res.id, timestamp: new Date().toISOString(), type: 'appartment', name: data.name, metadata: data.metadata, rooms: [] });
                await this.saveData();
                this.renderTree();
            });
        });

        this.initDashboardGrid(building, 'building-dashboard-grid', `dashboard_building_${building.id}`, '#building-edit-mode-btn', '#building-add-tile-btn');
    },

    renderFloorDashboard(floor, building) {
        const content = document.getElementById('locations-content');
        if (!content) return;

        let extraInfo = '';
        if (floor.metadata && floor.metadata.rooms_count) extraInfo += `${floor.metadata.rooms_count} Zimmer`;
        if (floor.metadata && floor.metadata.floor_level) extraInfo += extraInfo ? `, ${floor.metadata.floor_level}` : `${floor.metadata.floor_level}`;

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem;">
                <div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">${building.name}</div>
                    <h2 style="margin:0; color:var(--text-primary); font-size:1.6rem; margin-bottom: 0.2rem;">${floor.name}</h2>
                    ${extraInfo ? `<div style="font-size:0.85rem; color:var(--text-muted);">${extraInfo}</div>` : ''}
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button id="btn-edit-floor" class="btn-icon" title="Bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                    <button id="btn-delete-floor" class="btn-icon" title="Löschen"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                    <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 0.5rem;"></div>
                    <button id="btn-add-room" class="btn-add" title="Raum hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Raum hinzufügen</button>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; margin-bottom:1rem;">
                <h3 style="color:var(--text-primary); margin:0; font-size:1.1rem; font-weight:normal;">Grundriss / Übersicht: ${floor.name}</h3>
                <div style="display:flex; gap:0.5rem;">
                    <button id="floor-edit-mode-btn" class="btn-outline" title="Kachel-Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Kachel bearbeiten</button>
                    <button id="floor-add-tile-btn" class="btn-add" title="Kachel hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Kachel hinzufügen</button>
                </div>
            </div>
            <div id="floor-dashboard-grid" class="overview-container" style="background:transparent; border:none; padding:0;"></div>
        `;
        content.innerHTML = html;

        document.getElementById('btn-edit-floor').addEventListener('click', () => {
            const modalType = (floor.metadata || floor.type === 'appartment') ? 'appartment' : 'floor';
            this.openModal(modalType, modalType === 'appartment' ? 'Wohnung bearbeiten' : 'Stockwerk bearbeiten', { id: floor.locationTypeId, name: floor.name, metadata: floor.metadata }, async (data) => {
                floor.name = data.name;
                if (data.metadata) floor.metadata = data.metadata;
                if (data.templateId) floor.locationTypeId = data.templateId;
                await this.saveData();
                this.renderTree();
                this.renderFloorDashboard(floor, building);
            });
        });

        document.getElementById('btn-delete-floor').addEventListener('click', async () => {
            if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Stockwerk gelöscht werden soll?')) {
                building.floors = building.floors.filter(x => x.id !== floor.id);
                await this.saveData();
                this.renderTree();
                this.selectLocation('building', building.id);
            }
        });

        document.getElementById('btn-add-room').addEventListener('click', () => {
            this.openModal('room', 'Raum hinzufügen', { name: '' }, async (data) => {
                const res = await window.API.addLocation({ type: 'room', locationTypeId: data.templateId, name: data.name, parentId: floor.id, metadata: data.metadata });
                if (!floor.rooms) floor.rooms = [];
                floor.rooms.push({ id: res.id, timestamp: new Date().toISOString(), name: data.name, metadata: data.metadata });
                await this.saveData();
                this.renderTree();
            });
        });

        this.initDashboardGrid(floor, 'floor-dashboard-grid', `dashboard_floor_${floor.id}`, '#floor-edit-mode-btn', '#floor-add-tile-btn');
    },

    renderRoomDashboard(room, floor, building) {
        const content = document.getElementById('locations-content');
        if (!content) return;

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem;">
                <div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">${building.name} &nbsp;/&nbsp; ${floor.name}</div>
                    <h2 style="margin:0; color:var(--text-primary); font-size:1.6rem;">${room.name}</h2>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button id="btn-edit-room" class="btn-icon" title="Bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                    <button id="btn-delete-room" class="btn-icon" title="Löschen"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; margin-bottom:1rem;">
                <h3 style="color:var(--text-primary); margin:0; font-size:1.1rem; font-weight:normal;">Dashboard: ${room.name}</h3>
                <div style="display:flex; gap:0.5rem;">
                    <button id="room-edit-mode-btn" class="btn-outline" title="Kachel-Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Kachel bearbeiten</button>
                    <button id="room-add-tile-btn" class="btn-add" title="Kachel hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Kachel hinzufügen</button>
                </div>
            </div>
            <div id="room-dashboard-grid" class="overview-container" style="background:transparent; border:none; padding:0;"></div>
        `;
        content.innerHTML = html;

        document.getElementById('btn-edit-room').addEventListener('click', () => {
            this.openModal('room', 'Raum bearbeiten', { id: room.locationTypeId, name: room.name, metadata: room.metadata }, async (data) => {
                room.name = data.name;
                if (data.templateId) room.locationTypeId = data.templateId;
                if (data.metadata) room.metadata = data.metadata;
                await this.saveData();
                this.renderTree();
                this.renderRoomDashboard(room, floor, building);
            });
        });

        document.getElementById('btn-delete-room').addEventListener('click', async () => {
            if (await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass der Raum gelöscht werden soll?')) {
                floor.rooms = floor.rooms.filter(x => x.id !== room.id);
                await this.saveData();
                this.renderTree();
                this.selectLocation('floor', floor.id);
            }
        });

        this.initDashboardGrid(room, 'room-dashboard-grid', `dashboard_room_${room.id}`, '#room-edit-mode-btn', '#room-add-tile-btn');
    },

    initDashboardGrid(locationObj, containerId, storageKey, editBtnSelector, addBtnSelector) {
        const locationIds = new Set([locationObj.id]);
        
        const collectIds = (loc) => {
            if (loc.floors) loc.floors.forEach(f => { locationIds.add(f.id); collectIds(f); });
            if (loc.rooms) loc.rooms.forEach(r => { locationIds.add(r.id); });
        };
        collectIds(locationObj);

        const assignedDatapoints = this.allDatapoints.filter(dp => locationIds.has(dp.locationId) && ['Sensor', 'Aktor'].includes(dp.dpType));

        if (typeof window.TileManager !== 'undefined') {
            this.currentDashboard = window.TileManager.createInstance({
                container: `#${containerId}`,
                storageKey: storageKey,
                editBtn: editBtnSelector,
                addBtn: addBtnSelector,
                allowedDatapoints: assignedDatapoints.map(d => d.id)
            });
            this.currentDashboard.init();
        }
    }
};
window.LocationsManager = LocationsManager;