/**
 * devices.js – Spezifische Logik für Hardware-Geräte
 */
const DeviceManager = {
    table: null,

    init() {
        const container = document.getElementById('device-table-container');
        if (!container) return;

        const columns = [
            { key: 'id',         label: 'Device-ID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">${val}</span>` },
            { key: 'name',       label: 'Gerätename' },
            { key: 'modelName',  label: 'Modell', render: (val, row) => `${val || '—'}<br><small style="color: var(--text-muted);">${row.manufacturerName || ''}</small>` },
            { key: 'locationName',   label: 'Standort' },
            { key: 'busTypeName',    label: 'Netzwerk' },
            { key: 'macAddress', label: 'MAC Adresse', render: (val) => val ? `<span style="font-family: monospace;">${val}</span>` : '—' },
            { key: 'busAddress', label: 'Bus Adresse', render: (val) => val ? `<span style="font-family: monospace;">${val}</span>` : '—' },
            { key: 'status',     label: 'Status', render: (val) => {
                if (val === 'active') return `<span class="badge badge--active">Aktiv</span>`;
                if (val === 'searching') return `<span class="badge badge--searching">Wird gesucht... ⏳</span>`;
                if (val === 'not_reachable') return `<span class="badge badge--error">Nicht erreichbar ❌</span>`;
                if (val === 'warning') return `<span class="badge badge--warning">Warnung</span>`;
                return `<span class="badge badge--inactive">${val || 'Unbekannt'}</span>`;
            }},
            { key: 'health',     label: 'Zustand', render: (_, row) => {
                let html = '';
                if (row.battery !== undefined && row.battery !== null) {
                    const bColor = row.battery <= 20 ? 'var(--error-red)' : (row.battery <= 50 ? 'var(--accent-yellow)' : 'var(--accent-green)');
                    html += `<span title="Batterie: ${row.battery}%" style="color: ${bColor}; font-size: 0.85em; margin-right: 8px;">🔋 ${row.battery}%</span>`;
                }
                if (row.signal !== undefined && row.signal !== null) {
                    const sColor = row.signal <= 40 ? 'var(--error-red)' : (row.signal <= 70 ? 'var(--accent-yellow)' : 'var(--accent-green)');
                    html += `<span title="Signalstärke: ${row.signal}%" style="color: ${sColor}; font-size: 0.85em;">📶 ${row.signal}%</span>`;
                }
                return html !== '' ? html : '<span style="color: var(--text-secondary);">—</span>';
            }},
            { key: 'ios',        label: 'IO-Ports', render: (_, row) => {
                const usedChannels = row.usedChannels || [];
                const allChannels = row.channels || row.ports || [];
                let channelsArray = [];
                
                if (Array.isArray(allChannels) && allChannels.length > 0) {
                    channelsArray = allChannels;
                } else if (typeof allChannels === 'number' && allChannels > 0) {
                    for (let i = 1; i <= allChannels; i++) channelsArray.push(i.toString());
                } else if (usedChannels.length > 0) {
                    channelsArray = usedChannels;
                }

                if (channelsArray.length === 0) return '<span style="color: var(--text-secondary);">—</span>';

                // Die DB liefert usedChannels als Zahlen-Array [1, 2]. Wir wandeln es für den Vergleich in Strings um.
                const usedStr = usedChannels.map(String);

                return channelsArray.map(ch => {
                    const isUsed = usedStr.includes(String(ch));
                    const cssClass = isUsed ? 'io-port io-port--used' : 'io-port io-port--free';
                    return `<span title="${isUsed ? 'Genutzt' : 'Frei'}" class="${cssClass}">${ch}</span>`;
                }).join('');
            }},
            { key: 'updated',    label: 'Zuletzt Online' },
        ];

        this.table = new DataTable(container, columns, {
            searchable: true,
            customButtons: [
                {
                    className: 'btn-add',
                    html: '<span><img src="assets/icons/refresh-cw-alt-2-svgrepo-com.svg" alt="Scan"></span> Netzwerk-Scan',
                    onClick: () => this.scanAllNetworks()
                }
            ],
            onAdd: () => this.showAddModal(),
            onEdit: (row) => this.showEditModal(row),
            onDelete: (rowId) => this.deleteDevice(rowId)
        });

        this.loadData();
    },

    async loadData() {
        try {
            const devices = await window.API.getDevices();
            this.table.setData(devices);
        } catch (err) {
            console.error("Fehler beim Laden der Geräte:", err);
        }
    },

    async getFormattedLocationOptions() {
        let locations = [];
        try { locations = await window.API.getLocations(); } catch (e) { console.warn("Fehler beim Laden der Standorte", e); }

        let locOptions = [{ value: '', label: '-- Nicht zugewiesen --' }];
        locations.forEach(bldg => {
            locOptions.push({ value: bldg.id, label: `🏢 ${bldg.name}` });
            (bldg.floors || []).forEach(floor => {
                locOptions.push({ value: floor.id, label: `&nbsp;&nbsp;🟰 ${floor.name}` });
                (floor.rooms || []).forEach(room => {
                    locOptions.push({ value: room.id, label: `&nbsp;&nbsp;&nbsp;&nbsp;🚪 ${room.name}` });
                });
            });
        });
        return locOptions;
    },

    async getModelTypeOptions() {
        let types = [];
        try {
            types = await window.API.getModelTypes();
        } catch (e) {
            console.warn("Fehler beim Laden der Modell-Typen.", e);
            types = []; // Leeres Array als Fallback
        }
        return types;
    },

    async getBusTypeOptions(includeEmpty = false) {
        let types = [];
        try {
            types = await window.API.getBusTypes();
        } catch (e) {
            console.error("Fehler beim Laden der Bus-Typen:", e);
            types = []; // Leeres Array als Fallback
        }
        
        const options = types.map(t => ({ value: t.id, label: t.name }));
        if (includeEmpty) {
            options.unshift({ value: '', label: '-- Bitte wählen --' });
        }
        return options;
    },

    async showAddModal() {
        const locOptions = await this.getFormattedLocationOptions();
        const busOptions = await this.getBusTypeOptions(true);
        const modelOptions = await this.getModelTypeOptions();

        const result = await window.Dialog.formWithTable({
            title: 'Neues Hardware-Gerät erfassen',
            saveText: 'Hinzufügen',
            fields: [
                { id: 'name', label: 'Eigener Name *', placeholder: 'z.B. Deckenlampe', fullWidth: true },
                { id: 'modelName', label: 'Modell *', placeholder: 'Bitte Modell aus der Tabelle wählen', fullWidth: false },
                { id: 'modelTypeId', type: 'hidden' },
                { id: 'serialNumber', label: 'Seriennummer *', placeholder: 'S/N', fullWidth: false },
                { id: 'location', label: 'Standort', type: 'select', options: locOptions, fullWidth: true },
                { id: 'busType', label: 'Netzwerk (Bus) *', type: 'select', options: busOptions, fullWidth: false },
                { id: 'address', label: 'MAC- oder Bus-Adresse * <small style="font-weight:normal; color:var(--text-muted);">(MAC mit ":", Bus z.B. "0xFF")</small>', placeholder: 'z.B. AA:BB:CC... oder 0xFF', fullWidth: false }
            ],
            tables: [
                {
                    id: 'scanResults',
                    title: '🔍 Gefundene, nicht registrierte Geräte',
                    columns: [
                        { key: 'busType', label: 'Netzwerk' },
                        { key: 'address', label: 'Adresse', render: (val, row) => row.macAddress || row.busAddress || val }
                    ],
                    data: [],
                    onRowSelect: (row, fields) => {
                        if (row.address === '—' || row.address === '⏳') return;
                        fields.address.value = row.macAddress || row.busAddress || '';

                        // Finde die korrekte Option im Select basierend auf dem Namen (Label) und setze den Wert (ID)
                        const busNameToFind = row.busType || '';
                        const busTypeSelect = fields.busType;
                        const matchingOption = busOptions.find(opt => opt.label === busNameToFind);
                        
                        busTypeSelect.value = matchingOption ? matchingOption.value : '';

                    }
                },
                {
                    id: 'modelList',
                    title: '🏷️ Freigegebene Modelle',
                    columns: [
                        { key: 'name', label: 'Modellname' }
                    ],
                    data: modelOptions,
                    onRowSelect: (row, fields) => {
                        fields.modelName.value = row.name || '';
                        fields.modelTypeId.value = row.id || '';
                    }
                }
            ],
            onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                const busTypeSelect = fields.busType;
                const addressInput = fields.address;
                let fullScanResults = []; // Cache für alle gefundenen Geräte
                
                // Wechsel zum Modell-Tab und Omni-Suche, wenn das Feld fokussiert wird
                const handleModelInput = (e) => {
                    switchToTab('modelList');
                    if (filterTable) filterTable(e.target.value);
                };
                fields.modelName.addEventListener('focus', handleModelInput);
                fields.modelName.addEventListener('input', handleModelInput);

                const applyFilter = () => {
                    const bType = busTypeSelect.value;
                    const addrQuery = addressInput.value.trim().toLowerCase();
                    const existingDevices = this.table.data || [];
                    
                    // Filtere Geräte nach ausgewähltem Bus und entferne bereits registrierte
                    const filtered = fullScanResults.filter(netDev => {
                        if (bType && netDev.busType !== bType) return false;
                        
                        const netAddr = netDev.macAddress || netDev.busAddress || '';
                        
                        // Filter nach eingetippter Adresse anwenden (Teilübereinstimmung)
                        if (addrQuery && !netAddr.toLowerCase().includes(addrQuery)) return false;

                        return !existingDevices.some(regDev => 
                            (regDev.macAddress === netAddr || regDev.busAddress === netAddr)
                        );
                    });
                    
                    if (filtered.length === 0) {
                        updateTableData('scanResults', [{ busType: bType || '-', address: '—' }]);
                    } else {
                        updateTableData('scanResults', filtered);
                    }
                };

                const initialScan = async () => {
                    updateTableData('scanResults', [{ busType: '-', address: '⏳' }]);
                    try {
                        fullScanResults = await window.API.scanNetwork(''); // Lade initial ALLE Geräte
                        applyFilter();
                    } catch (e) {
                        updateTableData('scanResults', [{ busType: '-', address: '—' }]);
                    }
                };

                // Scan sofort beim Öffnen ausführen
                initialScan();

                busTypeSelect.addEventListener('change', () => {
                    switchToTab('scanResults');
                    applyFilter();
                });

                // Fokussieren oder Eingabe im Adress-Feld wechselt zur Scan-Tabelle
                addressInput.addEventListener('focus', () => {
                    switchToTab('scanResults');
                    applyFilter();
                });
                addressInput.addEventListener('input', () => {
                    switchToTab('scanResults');
                    applyFilter();
                });
            },
            validate: (res) => {
                if (!res.name || !res.address || !res.busType || !res.modelTypeId || !res.serialNumber) {
                    window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                    return false;
                }
                // Zusätzliche Validierung für die Bus-Adresse
                if (!res.address.includes(':')) {
                    const busAddressNum = parseInt(res.address);
                    if (isNaN(busAddressNum)) {
                        window.Dialog.alert('Ungültige Eingabe', 'Die Bus-Adresse ist ungültig. Bitte geben Sie eine Zahl (z.B. 5) oder einen Hex-Wert (z.B. 0xFF) ein.', true);
                        return false;
                    }
                    if (busAddressNum < 0 || busAddressNum > 32767) {
                        window.Dialog.alert('Ungültiger Wert', 'Die Bus-Adresse muss zwischen 0 und 32767 liegen.', true);
                        return false;
                    }
                }
                return true;
            }
        });

        if (result) {
            const isMac = result.address.includes(':');
            const newEntry = {
                device_name: result.name,
                model_type_id: result.modelTypeId,
                serial_number: result.serialNumber,
                bus_type_id: result.busType,
                location_id: result.location,
                mac_address: isMac ? result.address : null,
                bus_address: !isMac ? parseInt(result.address) : null,
                status: 'searching'
            };

            try {
                const res = await window.API.addDevice(newEntry);
                // Nach erfolgreichem Hinzufügen die Daten neu laden, um den neuen Eintrag korrekt darzustellen
                this.loadData();
            } catch (err) {
                window.Dialog.alert('Fehler beim Speichern', err.message, true);
            }
        }
    },

    async showEditModal(row) {
        const locOptions = await this.getFormattedLocationOptions();
        const busOptions = await this.getBusTypeOptions(false);
        const modelOptions = await this.getModelTypeOptions();

        // Finde den Namen des aktuell gesetzten Modells (falls vorhanden)
        const currentModel = modelOptions.find(m => m.id === row.modelTypeId);
        const modelNameValue = currentModel ? currentModel.name : '';
        
        const addrValue = row.macAddress || row.busAddress || '';
        
        const result = await window.Dialog.formWithTable({
            title: 'Gerät bearbeiten',
            saveText: 'Speichern & Suchen',
            fields: [
                { id: 'name', label: 'Name *', value: row.name, fullWidth: true },
                { id: 'modelName', label: 'Modell *', value: modelNameValue, fullWidth: false },
                { id: 'modelTypeId', type: 'hidden', value: row.modelTypeId || '' },
                { id: 'serialNumber', label: 'Seriennummer', value: row.serial_number || '', fullWidth: false, readonly: true },
                { id: 'location', label: 'Standort', type: 'select', value: row.location_id, options: locOptions, fullWidth: true },
                { id: 'address', label: 'MAC- oder Bus-Adresse * <small style="font-weight:normal; color:var(--text-muted);">(MAC mit ":", Bus z.B. "0xFF")</small>', placeholder: 'z.B. AA:BB:CC... oder 0xFF', value: addrValue, fullWidth: true },
                { id: 'busType', label: 'Netzwerk (Bus) *', type: 'select', value: row.bus_type_id, options: busOptions, fullWidth: true }
            ],
            tables: [
                {
                    id: 'modelList',
                    title: '🏷️ Freigegebene Modelle',
                    columns: [
                        { key: 'name', label: 'Modellname' }
                    ],
                    data: modelOptions,
                    onRowSelect: (r, fields) => {
                        fields.modelName.value = r.name || '';
                        fields.modelTypeId.value = r.id || '';
                    }
                }
            ],
            onReady: (modal, fields, updateTableData, switchToTab, filterTable) => {
                const handleModelInput = (e) => {
                    switchToTab('modelList');
                    if (filterTable) filterTable(e.target.value);
                };
                fields.modelName.addEventListener('focus', handleModelInput);
                fields.modelName.addEventListener('input', handleModelInput);
            },
            validate: (res) => {
                if (!res.name || !res.address || !res.busType || !res.modelTypeId) {
                    window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                    return false;
                }
                // Zusätzliche Validierung für die Bus-Adresse
                if (!res.address.includes(':')) {
                    const busAddressNum = parseInt(res.address);
                    if (isNaN(busAddressNum)) {
                        window.Dialog.alert('Ungültige Eingabe', 'Die Bus-Adresse ist ungültig. Bitte geben Sie eine Zahl (z.B. 5) oder einen Hex-Wert (z.B. 0xFF) ein.', true);
                        return false;
                    }
                    if (busAddressNum < 0 || busAddressNum > 32767) {
                        window.Dialog.alert('Ungültiger Wert', 'Die Bus-Adresse muss zwischen 0 und 32767 liegen.', true);
                        return false;
                    }
                }
                return true;
            }
        });

        if (result) {
            const isMac = result.address.includes(':');
            const updatePayload = {
                device_name: result.name,
                model_type_id: result.modelTypeId,
                location_id: result.location,
                bus_type_id: result.busType,
                mac_address: isMac ? result.address : null,
                bus_address: !isMac ? parseInt(result.address) : null
            };

            try { 
                await window.API.updateDevice(row.id, { ...row, ...updatePayload }); 
                await this.loadData(); // Lade die Daten neu, um die Änderungen zu sehen
                this.triggerSearch(this.table.data.find(d => d.id === row.id)); 
            } catch (err) { 
                window.Dialog.alert('Fehler', 'Fehler beim Speichern.', true); 
            }
        }
    },

    async deleteDevice(rowId) {
        try {
            await window.API.deleteDevice(rowId);
            this.table.data = this.table.data.filter(r => r.id !== rowId);
            this.table.setData(this.table.data);
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            window.Dialog.alert("Fehler", "Löschen fehlgeschlagen.", true);
        }
    },

    triggerSearch(row) {
        const index = this.table.data.findIndex(r => r.id === row.id);
        if (index === -1) return;
        
        this.table.data[index].status = 'searching';
        this.table.setData(this.table.data);
        
        this.executeDeviceScan(this.table.data[index]);
    },

    scanAllNetworks() {
        if (!this.table || !this.table.data || this.table.data.length === 0) return;
        
        // Setze alle Geräte optisch auf Such-Status und rendere einmal gesammelt neu
        this.table.data.forEach(row => row.status = 'searching');
        this.table.setData(this.table.data);
        
        // Bereite die Daten für den Bulk-Scan vor
        const devicesToScan = this.table.data.map(row => ({
            address: row.macAddress || row.busAddress || '',
            busType: row.busType || ''
        }));

        // Führe den Bulk-Scan aus
        (async () => {
            try {
                const scanResults = await window.API.scanDevicesBulk(devicesToScan);
                
                // Verarbeite die Ergebnisse und update die Tabelle
                scanResults.forEach(foundDevice => {
                    const originalDeviceRow = this.table.data.find(row => (row.macAddress || row.busAddress) === foundDevice.originalAddress);
                    if (originalDeviceRow) {
                        if (!foundDevice.id) { // Gerät wurde im Scan nicht gefunden
                            originalDeviceRow.status = 'not_reachable';
                        } else {
                            originalDeviceRow.status = 'active';
                            originalDeviceRow.health = 'OK';
                            if (foundDevice.battery !== undefined) originalDeviceRow.battery = foundDevice.battery;
                            if (foundDevice.signal !== undefined) originalDeviceRow.signal = foundDevice.signal;
                            if (foundDevice.channels) originalDeviceRow.channels = foundDevice.channels;
                        }
                        window.API.updateDevice(originalDeviceRow.id, originalDeviceRow);
                    }
                });
            } catch (e) {
                this.table.data.forEach(row => row.status = 'not_reachable');
            } finally {
                this.table._render();
            }
        })();
    },

    async executeDeviceScan(deviceRow) {
        try {
            const addr = deviceRow.macAddress || deviceRow.busAddress || '';
            const bType = deviceRow.busType || '';
            const found = await window.API.scanDevice(addr, bType);
            
            if (found) {
                deviceRow.status = 'active';
                deviceRow.health = 'OK';
                if (found.battery !== undefined) deviceRow.battery = found.battery;
                if (found.signal !== undefined) deviceRow.signal = found.signal;
                if (found.channels) deviceRow.channels = found.channels;
            } else {
                deviceRow.status = 'not_reachable';
            }
        } catch (e) {
            deviceRow.status = 'not_reachable';
        }
        
        await window.API.updateDevice(deviceRow.id, deviceRow);
        this.table._render(); // Aktualisiert die Tabelle ressourcenschonend ohne Pagination-Verlust
    }
};