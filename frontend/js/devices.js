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

    async showAddModal() {
        let locations = [];
        try { locations = await window.API.getLocations(); } catch(e) {}
        
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

        const result = await window.Dialog.formWithTable({
            title: 'Neues Hardware-Gerät erfassen',
            saveText: 'Hinzufügen',
            tables: [], // Wir nutzen das Modal im Kompakt-Modus ohne Tabelle
            fields: [
                { id: 'name', label: 'Name *', placeholder: 'Eigener Name (z.B. Deckenlampe)', fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', options: locOptions, fullWidth: true },
                { id: 'address', label: 'MAC- oder Bus-Adresse *', placeholder: 'z.B. AA:BB:CC... oder 0x05', fullWidth: true },
                { id: 'busType', label: 'Netzwerk (Bus) *', type: 'select', options: [
                    { value: 'WIFI', label: 'WIFI' },
                    { value: 'Thread', label: 'Thread' },
                    { value: 'RS485', label: 'RS485' },
                    { value: 'Ethernet', label: 'Ethernet' }
                ], fullWidth: true }
            ]
        });

        if (result) {
            if (!result.name || !result.address) {
                window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                return;
            }
            
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
        let locations = [];
        try { locations = await window.API.getLocations(); } catch(e) {}
        
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

        const addrValue = row.macAddress || row.busAddress || '';
        
        const result = await window.Dialog.formWithTable({
            title: 'Gerät bearbeiten',
            saveText: 'Speichern & Suchen',
            tables: [],
            fields: [
                { id: 'name', label: 'Name *', value: row.name, fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', value: row.location, options: locOptions, fullWidth: true },
                { id: 'address', label: 'MAC- oder Bus-Adresse *', value: addrValue, fullWidth: true },
                { id: 'busType', label: 'Netzwerk (Bus) *', type: 'select', value: row.busType, options: [
                    { value: 'WIFI', label: 'WIFI' },
                    { value: 'Thread', label: 'Thread' },
                    { value: 'RS485', label: 'RS485' },
                    { value: 'Ethernet', label: 'Ethernet' }
                ], fullWidth: true }
            ]
        });

        if (result) {
            if (!result.name || !result.address) {
                window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                return;
            }
            
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
        
        (async () => {
            try {
                const addr = this.table.data[index].macAddress || this.table.data[index].busAddress || '';
                const bType = this.table.data[index].busType || '';
                const found = await window.API.scanDevice(addr, bType);
                
                if (found) {
                    this.table.data[index].status = 'active';
                    this.table.data[index].health = 'OK';
                    if (found.battery !== undefined) this.table.data[index].battery = found.battery;
                    if (found.signal !== undefined) this.table.data[index].signal = found.signal;
                    if (found.channels) this.table.data[index].channels = found.channels;
                } else {
                    this.table.data[index].status = 'not_reachable';
                }
            } catch (e) {
                this.table.data[index].status = 'not_reachable';
            }
            
            await window.API.updateDevice(this.table.data[index].id, this.table.data[index]);
            this.table.setData(this.table.data);
        })();
    }
};