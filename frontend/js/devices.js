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
            { key: 'location',   label: 'Standort' },
            { key: 'busType',    label: 'Netzwerk' },
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

                return channelsArray.map(ch => {
                    const isUsed = usedChannels.includes(String(ch));
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
            const [devices, datapoints] = await Promise.all([
                window.API.getDevices(),
                window.API.getDatapoints()
            ]);
            const mergedDevices = devices.map(device => {
                const deviceDatapoints = datapoints.filter(dp => dp.deviceId === device.id);
                const usedChannels = deviceDatapoints.filter(dp => dp.channel != null).map(dp => String(dp.channel));
                return { ...device, usedChannels };
            });
            this.table.setData(mergedDevices);
        } catch (err) {
            console.error("Fehler beim Laden der Geräte:", err);
        }
    },

    async getFormattedLocationOptions() {
        let locations = [];
        try { locations = await window.API.getLocations(); } catch (e) { console.warn("Fehler beim Laden der Standorte", e); }

        let locOptions = [{ value: '', label: '-- Nicht zugewiesen --' }];
        locations.forEach(bldg => {
            locOptions.push({ value: bldg.name, label: `🏢 ${bldg.name}` });
            (bldg.floors || []).forEach(floor => {
                locOptions.push({ value: floor.name, label: `&nbsp;&nbsp;🟰 ${floor.name}` });
                (floor.rooms || []).forEach(room => {
                    locOptions.push({ value: room.name, label: `&nbsp;&nbsp;&nbsp;&nbsp;🚪 ${room.name}` });
                });
            });
        });
        return locOptions;
    },

    async getBusTypeOptions(includeEmpty = false) {
        let types = [];
        try {
            types = await window.API.getBusTypes();
        } catch (e) {
            types = ['WIFI', 'Thread', 'RS485', 'Ethernet']; // Not-Fallback
        }
        
        const options = types.map(t => ({ value: t, label: t }));
        if (includeEmpty) {
            options.unshift({ value: '', label: '-- Bitte wählen --' });
        }
        return options;
    },

    async showAddModal() {
        const locOptions = await this.getFormattedLocationOptions();
        const busOptions = await this.getBusTypeOptions(true);

        const result = await window.Dialog.formWithTable({
            title: 'Neues Hardware-Gerät erfassen',
            saveText: 'Hinzufügen',
            fields: [
                { id: 'name', label: 'Name *', placeholder: 'Eigener Name (z.B. Deckenlampe)', fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', options: locOptions, fullWidth: true },
                { id: 'busType', label: 'Netzwerk (Bus) *', type: 'select', options: busOptions, fullWidth: false },
                { id: 'address', label: 'MAC- oder Bus-Adresse *', placeholder: 'z.B. AA:BB:CC... oder 0x05', fullWidth: false }
            ],
            tables: [
                {
                    id: 'scanResults',
                    title: '🔍 Gefundene, nicht registrierte Geräte',
                    columns: [
                        { key: 'name', label: 'Typ / Name' },
                        { key: 'busType', label: 'Netzwerk' },
                        { key: 'address', label: 'Adresse', render: (val, row) => row.macAddress || row.busAddress || val }
                    ],
                    data: [],
                    onRowSelect: (row, fields) => {
                        if (row.address === '—' || row.address === '⏳') return; // Platzhalter-Klicks ignorieren
                        fields.address.value = row.macAddress || row.busAddress || '';
                        fields.busType.value = row.busType || '';
                        if (!fields.name.value) fields.name.value = row.name || row.type || '';
                    }
                }
            ],
            onReady: (modal, fields, updateTableData, switchToTab) => {
                const busTypeSelect = fields.busType;
                const addressInput = fields.address;
                let fullScanResults = []; // Cache für alle gefundenen Geräte
                
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
                        updateTableData('scanResults', [{ name: 'Keine neuen Geräte gefunden', busType: bType || '-', address: '—' }]);
                    } else {
                        updateTableData('scanResults', filtered);
                    }
                };

                const initialScan = async () => {
                    updateTableData('scanResults', [{ name: 'Scanne Netzwerk...', busType: '-', address: '⏳' }]);
                    try {
                        fullScanResults = await window.API.scanNetwork(''); // Lade initial ALLE Geräte
                        applyFilter();
                    } catch (e) {
                        updateTableData('scanResults', [{ name: 'Fehler beim Scan', busType: '-', address: '—' }]);
                    }
                };

                // Scan sofort beim Öffnen ausführen
                initialScan();

                busTypeSelect.addEventListener('change', () => {
                    switchToTab('scanResults');
                    applyFilter();
                });

                // Live-Suche bei der Eingabe einer Adresse
                addressInput.addEventListener('input', () => {
                    switchToTab('scanResults');
                    applyFilter();
                });
            },
            validate: (res) => {
                if (!res.name || !res.address || !res.busType) {
                    window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                    return false;
                }
                return true;
            }
        });

        if (result) {
            const newEntry = {
                timestamp: new Date().toISOString(), name: result.name, location: result.location, status: 'searching', updated: 'jetzt',
                macAddress: result.address.includes(':') ? result.address : '',
                busAddress: !result.address.includes(':') ? result.address : '',
                busType: result.busType, health: '—', battery: null, signal: null, channels: []
            };

            try {
                const res = await window.API.addDevice(newEntry);
                newEntry.id = res.id;
                this.table._addRow(newEntry);
                this.triggerSearch(newEntry);
            } catch (err) {
                window.Dialog.alert('Fehler', 'Fehler beim Speichern im System.', true);
            }
        }
    },

    async showEditModal(row) {
        const locOptions = await this.getFormattedLocationOptions();
        const busOptions = await this.getBusTypeOptions(false);

        const addrValue = row.macAddress || row.busAddress || '';
        
        const result = await window.Dialog.formWithTable({
            title: 'Gerät bearbeiten',
            saveText: 'Speichern & Suchen',
            tables: [],
            fields: [
                { id: 'name', label: 'Name *', value: row.name, fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', value: row.location, options: locOptions, fullWidth: true },
                { id: 'address', label: 'MAC- oder Bus-Adresse *', value: addrValue, fullWidth: true },
                { id: 'busType', label: 'Netzwerk (Bus) *', type: 'select', value: row.busType, options: busOptions, fullWidth: true }
            ],
            validate: (res) => {
                if (!res.name || !res.address || !res.busType) {
                    window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                    return false;
                }
                return true;
            }
        });

        if (result) {
            row.name = result.name; 
            row.location = result.location;
            row.macAddress = result.address.includes(':') ? result.address : ''; 
            row.busAddress = !result.address.includes(':') ? result.address : '';
            row.busType = result.busType;

            try { 
                await window.API.updateDevice(row.id, row); 
                this.table._render(); 
                this.triggerSearch(row); 
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