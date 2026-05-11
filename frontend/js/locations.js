/**
 * locations.js – Grafische Kachel-Darstellung der Gebäude-Struktur
 */
const LocationsManager = {
    init() {
        this.container = document.getElementById('locations-container');
        if (!this.container) return;
        this.isEditMode = false;
        this.createModal();
        this.loadData();
    },

    createModal() {
        if (document.getElementById('location-modal')) return;
        const modalHtml = `
            <div id="location-modal" class="table-modal hidden">
                <div class="table-modal-box">
                    <h3 id="loc-modal-title">Edit</h3>
                    <div class="settings-group">
                        <label>Typ / Vorlage <span style="font-size:0.8em; color:var(--text-muted); font-weight:normal;">(Suchen oder <a href="#" id="loc-modal-clear-name-link" style="color:var(--accent-blue); text-decoration:none;">Felder leeren</a>)</span></label>
                        <input id="loc-modal-type-search" type="text" placeholder="Gespeicherten Typ suchen..." list="loc-modal-type-list">
                        <datalist id="loc-modal-type-list"></datalist>
                    </div>
                    <div id="loc-modal-name-fields" style="display:flex; flex-direction:column; gap:0.5rem; margin-top: 0.5rem; padding: 1rem; border: 1px dashed var(--border-color); border-radius: 8px; background: var(--bg-mantle);">
                        <div class="settings-group">
                            <label>Name *</label>
                            <input id="loc-modal-input" type="text" placeholder="Eigener Name (z.B. Wohnzimmer)...">
                        </div>
                    </div>
                <div id="loc-modal-address-container" style="display:none; flex-direction:column; gap:0.5rem; margin-top: 0.5rem;">
                    <div class="settings-group">
                        <label>Adresse <span style="font-size:0.8em; color:var(--text-muted); font-weight:normal;">(Suchen oder <a href="#" id="loc-modal-new-address-link" style="color:var(--accent-blue); text-decoration:none;">Felder leeren</a>)</span></label>
                        <input id="loc-modal-address-search" type="text" placeholder="Gespeicherte Adresse suchen..." list="loc-modal-address-list">
                        <datalist id="loc-modal-address-list"></datalist>
                    </div>
                    <div id="loc-modal-address-fields" style="display:flex; flex-direction:column; gap:0.5rem; margin-top: 0.5rem; padding: 1rem; border: 1px dashed var(--border-color); border-radius: 8px; background: var(--bg-mantle);">
                        <div class="settings-group">
                            <label>Strasse & Hausnummer</label>
                            <div style="display:flex; gap:0.5rem; width:100%;">
                                <input id="loc-modal-street" type="text" placeholder="Strasse" style="flex: 1; min-width: 0;">
                                <input id="loc-modal-number" type="text" placeholder="Nr." style="width: 70px; flex: none;">
                            </div>
                        </div>
                        <div class="settings-group">
                            <label>PLZ & Ort</label>
                            <div style="display:flex; gap:0.5rem; width:100%;">
                                <input id="loc-modal-zip" type="text" placeholder="PLZ" style="width: 90px; flex: none;">
                                <input id="loc-modal-city" type="text" placeholder="Ort" style="flex: 1; min-width: 0;" list="loc-modal-city-list">
                            </div>
                            <datalist id="loc-modal-city-list"></datalist>
                        </div>
                        <div class="settings-group">
                            <label>Land</label>
                            <input id="loc-modal-country" type="text" placeholder="z.B. Schweiz" value="">
                        </div>
                    </div>
                    </div>
                    <div class="table-modal-actions">
                        <button id="loc-modal-save" class="btn-primary">Speichern</button>
                        <button id="loc-modal-cancel">Abbrechen</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('loc-modal-zip').addEventListener('blur', async (e) => {
            const zip = e.target.value.trim();
            const country = document.getElementById('loc-modal-country').value.trim() || 'Schweiz';
            if (zip.length >= 4) {
                const cities = await window.API.lookupCityByZip(zip, country);
                const dataList = document.getElementById('loc-modal-city-list');
                dataList.innerHTML = ''; // Vorherige Einträge löschen
                if (cities && cities.length > 0) {
                    cities.forEach(city => {
                        dataList.insertAdjacentHTML('beforeend', `<option value="${city}">`);
                    });
                    
                    if (cities.length === 1) {
                        document.getElementById('loc-modal-city').value = cities[0];
                    } else {
                        document.getElementById('loc-modal-city').value = '';
                        document.getElementById('loc-modal-city').placeholder = 'Bitte wählen...';
                    }
                }
            }
        });

        document.getElementById('loc-modal-clear-name-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loc-modal-type-search').value = '';
            document.getElementById('loc-modal-input').value = '';
        });

        document.getElementById('loc-modal-type-search').addEventListener('input', (e) => {
            // Füllt das Namens-Feld automatisch aus, wenn ein Typ gesucht/gewählt wird
            document.getElementById('loc-modal-input').value = e.target.value;
        });

        document.getElementById('loc-modal-new-address-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loc-modal-address-search').value = '';
            document.getElementById('loc-modal-street').value = '';
            document.getElementById('loc-modal-number').value = '';
            document.getElementById('loc-modal-zip').value = '';
            document.getElementById('loc-modal-city').value = '';
            document.getElementById('loc-modal-country').value = '';
        });

        let addressSearchTimeout;
        document.getElementById('loc-modal-address-search').addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const datalist = document.getElementById('loc-modal-address-list');
            
            // 1. Prüfen, ob die Auswahl direkt im Cache ist (Passiert bei Klick auf einen Vorschlag)
            const found = (this.addressCache || []).find(a => a.str === query);
            if (found) {
                document.getElementById('loc-modal-street').value = found.obj.street || '';
                document.getElementById('loc-modal-number').value = found.obj.number || '';
                document.getElementById('loc-modal-zip').value = found.obj.zip || '';
                document.getElementById('loc-modal-city').value = found.obj.city || '';
                document.getElementById('loc-modal-country').value = found.obj.country || '';
                return;
            }
            
            // Erst ab 3 Zeichen anfangen zu suchen (schont die Datenbank)
            if (query.length < 3) {
                datalist.innerHTML = '';
                return;
            }

            // 2. Serverseitige Live-Suche über API ausführen (Debounced um Spam zu verhindern)
            clearTimeout(addressSearchTimeout);
            addressSearchTimeout = setTimeout(async () => {
                try {
                    const results = await window.API.searchAddresses(query);
                    this.addressCache = results || [];
                    
                    datalist.innerHTML = '';
                    this.addressCache.forEach(addr => {
                        datalist.insertAdjacentHTML('beforeend', `<option value="${addr.str}">`);
                    });
                } catch (err) {
                    console.error("Fehler bei der Adress-Suche in der API:", err);
                    this.addressCache = null;
                    datalist.innerHTML = '';
                }
            }, 400); // 400ms warten nach dem letzten Tastendruck
        });

        document.getElementById('loc-modal-cancel').addEventListener('click', () => {
            document.getElementById('location-modal').classList.add('hidden');
        });
        document.getElementById('loc-modal-save').addEventListener('click', async () => {
            if (this.modalCallback) {
                const name = document.getElementById('loc-modal-input').value.trim();
                const typeValue = document.getElementById('loc-modal-type-search').value.trim();
                const isBuilding = document.getElementById('loc-modal-address-container').style.display !== 'none';
                
                if (name) {
                    // Prüfen, ob ein neuer Typ eingetippt wurde, und diesen via API in der DB speichern
                    const typeToSave = typeValue || name;
                    if (this.currentLocationTypes && !this.currentLocationTypes.find(t => t.name.toLowerCase() === typeToSave.toLowerCase())) {
                        if (window.API.addLocationType) {
                            try {
                                await window.API.addLocationType({ name: typeToSave, group: this.currentLocationGroup });
                            } catch (e) {
                                console.error("Fehler beim Speichern des neuen Location-Types", e);
                            }
                        }
                    }

                    if (isBuilding) {
                        const address = {
                            street: document.getElementById('loc-modal-street').value.trim(),
                            number: document.getElementById('loc-modal-number').value.trim(),
                            zip: document.getElementById('loc-modal-zip').value.trim(),
                            city: document.getElementById('loc-modal-city').value.trim(),
                            country: document.getElementById('loc-modal-country').value.trim()
                        };
                        this.modalCallback({ name, address });
                    } else {
                        this.modalCallback({ name });
                    }
                }
            }
            document.getElementById('location-modal').classList.add('hidden');
        });
    },

    openModal(type, title, defaultData, callback) {
        document.getElementById('loc-modal-title').textContent = title;
        document.getElementById('loc-modal-input').value = defaultData.name || '';
        document.getElementById('loc-modal-type-search').value = defaultData.name || '';
        
        const typeList = document.getElementById('loc-modal-type-list');
        typeList.innerHTML = '';
        this.currentLocationTypes = [];
        this.currentLocationGroup = type;

        if (window.API && window.API.getLocationTypes) {
            window.API.getLocationTypes(type).then(types => {
                this.currentLocationTypes = types || [];
                (types || []).forEach(t => {
                    typeList.insertAdjacentHTML('beforeend', `<option value="${t.name}">`);
                });
            }).catch(err => console.error("Fehler beim Laden der Location-Types:", err));
        }

        const addressContainer = document.getElementById('loc-modal-address-container');
        const addressFields = document.getElementById('loc-modal-address-fields');
        const searchInput = document.getElementById('loc-modal-address-search');
        
        if (type === 'building') {
            addressContainer.style.display = 'flex';
            
            // Datalist und Cache beim Öffnen zurücksetzen (wird nun per API Live-Search geladen)
            const datalist = document.getElementById('loc-modal-address-list');
            datalist.innerHTML = '';
            this.addressCache = null;

            const addr = defaultData.address || {};
            document.getElementById('loc-modal-street').value = addr.street || '';
            document.getElementById('loc-modal-number').value = addr.number || '';
            document.getElementById('loc-modal-zip').value = addr.zip || '';
            document.getElementById('loc-modal-city').value = addr.city || '';
            document.getElementById('loc-modal-country').value = addr.country || '';
            
            if (addr.street) {
                searchInput.value = `${addr.street} ${addr.number || ''}, ${addr.zip || ''} ${addr.city || ''}`.trim();
            } else {
                searchInput.value = '';
            }
        } else {
            addressContainer.style.display = 'none';
        }

        this.modalCallback = callback;
        document.getElementById('location-modal').classList.remove('hidden');
        document.getElementById('loc-modal-type-search').focus();
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
            
            this.renderBuildings();
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
                <span class="breadcrumb-active">Locations</span>
                <div style="flex-grow:1"></div>
                <button id="btn-toggle-edit" class="btn-outline ${this.isEditMode ? 'active' : ''}" title="Edit layout"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit Buildings</button>
                <button id="btn-add-building" class="btn-outline" title="Add building"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Building</button>
            </div>
            <div class="floor-grid ${this.isEditMode ? 'edit-mode' : ''}">`;
        
        if (!this.locations || this.locations.length === 0) {
            html += `<p style="color: var(--text-secondary);">Keine Gebäude gefunden.</p>`;
        } else {
            this.locations.forEach((building, index) => {
                const floorCount = building.floors ? building.floors.length : 0;
                const addressText = building.address && building.address.street 
                    ? `<span style="display:block; font-size:0.8rem; color:var(--text-muted); margin-top: 5px;">${building.address.street} ${building.address.number}<br>${building.address.zip} ${building.address.city}</span>`
                    : '';
                
                html += `
                    <div class="location-card building-card" data-building="${building.id}" data-index="${index}" ${this.isEditMode ? 'draggable="true"' : ''}>
                        <div class="card-actions">
                            <button class="btn-icon btn-edit edit-building" data-id="${building.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Edit"></button>
                            <button class="btn-icon btn-delete delete-building" data-id="${building.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Remove"></button>
                        </div>
                        <h3>${building.name}</h3>
                        <p>${floorCount} Stockwerke</p>
                        ${addressText}
                        <div style="display:flex; gap:0.5rem; margin-top: 12px; width: 100%;">
                            <button class="btn-show-devices" data-id="${building.id}">
                                Hardware
                            </button>
                            <button class="btn-show-datapoints" data-id="${building.id}">
                                Sensors / Actors
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
            this.isEditMode = !this.isEditMode;
            this.renderBuildings();
        });

        if (this.isEditMode) {
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
            this.openModal('building', 'Add Building', { name: '' }, async (data) => {
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
                this.openModal('building', 'Edit Building', { name: b.name, address: b.address }, async (data) => {
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
                if (confirm('Gebäude wirklich löschen?')) {
                    this.locations = this.locations.filter(x => x.id !== btn.dataset.id);
                    await this.saveData();
                    this.renderBuildings();
                }
            });
        });

        this.container.querySelectorAll('.building-card').forEach(card => {
            card.addEventListener('click', () => {
                const buildingId = card.dataset.building;
                const building = this.locations.find(b => b.id === buildingId);
                if (building) this.renderBuildingDetails(building);
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
                    if (val === 'active') return `<span style="color:var(--text-success); font-weight:bold;">Active</span>`;
                    if (val === 'searching') return `<span style="color:var(--text-warning); font-weight:bold;">Searching...</span>`;
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
                { key: 'value',      label: 'Value' },
                { key: 'unit',       label: 'Unit' },
                { key: 'updated',    label: 'Last Update' }
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
            html += `<div class="tabs-container ${this.isEditMode ? 'edit-mode' : ''}" style="margin:0; padding:0; border-bottom:none; flex-wrap:wrap;">`;
            building.floors.forEach((floor, index) => {
                html += `
                    <div class="tab-wrapper" data-floor="${floor.id}" data-index="${index}" ${this.isEditMode ? 'draggable="true"' : ''}>
                        <button class="tab-button">${floor.name}</button>
                        <button class="btn-icon btn-edit edit-floor" data-id="${floor.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Edit"></button>
                        <button class="btn-icon btn-delete delete-floor" data-id="${floor.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Remove"></button>
                    </div>`;
            });
            html += `</div>`;
        }
        
        html += `
                <div style="flex-grow:1"></div>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.4rem;">
                    <button id="btn-toggle-edit" class="btn-outline ${this.isEditMode ? 'active' : ''}" title="Edit layout"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit Floors</button>
                    <button id="btn-add-floor" class="btn-outline" title="Add Floor/Appartment"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Floor/Appartment</button>
                </div>
            </div>
            <div id="rooms-container" class="${this.isEditMode ? 'edit-mode' : ''}"></div>
        `;
        
        this.container.innerHTML = html;
        document.getElementById('bc-locations').addEventListener('click', () => this.renderBuildings());
        
        document.getElementById('btn-toggle-edit').addEventListener('click', () => {
            this.isEditMode = !this.isEditMode;
            this.renderBuildingDetails(building);
        });

        document.getElementById('btn-add-floor').addEventListener('click', () => {
            this.openModal('floor', 'Add Floor/Appartment', { name: '' }, async (data) => {
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
                    this.openModal('floor', 'Edit Floor/Appartment', { name: f.name }, async (data) => {
                        f.name = data.name;
                        await this.saveData();
                        this.renderBuildingDetails(building);
                    });
                });
            });

            this.container.querySelectorAll('.delete-floor').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Stockwerk/Appartment wirklich löschen?')) {
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
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const floorId = tab.dataset.floor;
                    this.activeFloorId = floorId;
                    const floor = building.floors.find(f => f.id === floorId);
                    if (floor) this.renderRooms(floor, building);
                });
            });

            let activeFloor = building.floors.find(f => f.id === this.activeFloorId);
            if (!activeFloor && building.floors.length > 0) activeFloor = building.floors[0];
            if (activeFloor) {
                const activeTab = this.container.querySelector(`.tab-wrapper[data-floor="${activeFloor.id}"]`);
                if (activeTab) activeTab.classList.add('active');
                this.renderRooms(activeFloor, building);
            }

            if (this.isEditMode) {
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
            html += `<div class="tabs-container ${this.isEditMode ? 'edit-mode' : ''}" style="margin:0; padding:0; border-bottom:none; flex-wrap:wrap;">`;
            floor.rooms.forEach((room, index) => {
                html += `
                    <div class="tab-wrapper" data-room="${room.id}" data-index="${index}" ${this.isEditMode ? 'draggable="true"' : ''}>
                        <button class="tab-button">${room.name}</button>
                        <button class="btn-icon btn-edit edit-room" data-id="${room.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Edit"></button>
                        <button class="btn-icon btn-delete delete-room" data-id="${room.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Remove"></button>
                    </div>`;
            });
            html += `</div>`;
        }
        
        html += `
                <div style="flex-grow:1"></div>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.4rem;">
                    <button id="btn-toggle-edit-rooms" class="btn-outline ${this.isEditMode ? 'active' : ''}" title="Edit layout"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit Rooms</button>
                    <button id="btn-add-room" class="btn-outline" title="Add room"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Room</button>
                </div>
            </div>
            <div id="active-room-content"></div>
        `;
        roomsContainer.innerHTML = html;

        if (this.isEditMode) {
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
            this.isEditMode = !this.isEditMode;
            this.renderBuildingDetails(building);
        });

        document.getElementById('btn-add-room').addEventListener('click', () => {
            this.openModal('room', 'Add Room', { name: '' }, async (data) => {
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
                this.openModal('room', 'Edit Room', { name: r.name }, async (data) => {
                    r.name = data.name;
                    await this.saveData();
                    this.renderRooms(floor, building);
                });
            });
        });

        roomsContainer.querySelectorAll('.delete-room').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Raum wirklich löschen?')) {
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
                roomTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const roomId = tab.dataset.room;
                this.activeRoomId = roomId;
                const room = floor.rooms.find(r => r.id === roomId);
                if (room) this.renderRoomDetails(room, floor, building);
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
                    <button id="btn-edit-room-name" class="btn-outline" title="Raum umbenennen"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit Title</button>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button id="room-edit-mode-btn" class="btn-outline" title="Edit tile layout"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit Tile</button>
                    <button id="room-add-tile-btn" class="btn-outline" title="Add tile"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Tile</button>
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

        const btnEditName = document.getElementById('btn-edit-room-name');
        if (btnEditName) {
            btnEditName.addEventListener('click', () => {
                this.openModal('room', 'Edit Room', { name: room.name }, async (data) => {
                    room.name = data.name;
                    await this.saveData();
                    this.renderRooms(floor, building);
                });
            });
        }
    }
};
window.LocationsManager = LocationsManager;