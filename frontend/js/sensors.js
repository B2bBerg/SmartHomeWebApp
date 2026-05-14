/**
 * sensors.js – Spezifische Logik für Sensoren (Datenpunkte)
 */
const SensorManager = {
    table: null,

    init() {
        const container = document.getElementById('sensor-table-container');
        if (!container) return;

        const columns = [
            { key: 'id',         label: 'UUID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">${val || '—'}</span>` },
            { key: 'name',       label: 'Datenpunkt' },
            { key: 'deviceName', label: 'Gerät (Hardware)', render: (val) => val ? `<span style="color: #89b4fa;">${val}</span>` : '—' },
            { key: 'type',       label: 'Typ' },
            { key: 'location',   label: 'Standort' },
            { key: 'channel',    label: 'IO-Port', render: (val) => val ? `<span class="io-port io-port--assigned">${val}</span>` : '—' },
            { key: 'value',      label: 'Wert', render: (val, row) => (val !== undefined ? val : (row.state !== undefined ? row.state : '—')) },
            { key: 'unit',       label: 'Einheit' },
            { key: 'updated',    label: 'Letztes Update' },
        ];

        this.table = new DataTable(container, columns, {
            searchable: true,
            onAdd: () => this.showAddModal(),
            onEdit: (row) => this.showEditModal(row),
            onDelete: (rowId) => this.deleteSensor(rowId)
        });

        this.loadData();
    },

    async loadData() {
        try {
            const [datapoints, devices] = await Promise.all([window.API.getDatapoints(), window.API.getDevices()]);
            const sensors = datapoints.filter(dp => dp.isSensor || (dp.canRead && !dp.canWrite));
            const mergedData = sensors.map(s => {
                const dev = devices.find(d => d.id === s.deviceId) || {};
                return { ...dev, ...s, id: s.id, deviceName: dev.name };
            });
            this.table.setData(mergedData);
        } catch (err) {
            console.error("Fehler beim Laden der Sensoren:", err);
        }
    },

    async showAddModal() {
        let devices = [];
        let locations = [];
        let usedPortsMap = {};
        try {
            const [devs, datapoints, locs] = await Promise.all([
                window.API.getDevices(),
                window.API.getDatapoints(),
                window.API.getLocations()
            ]);
            devices = devs;
            locations = locs;
            datapoints.forEach(dp => {
                if (dp.deviceId && dp.channel) {
                    if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                    usedPortsMap[dp.deviceId].add(String(dp.channel));
                }
            });
        } catch (err) { console.error("Konnte Daten nicht laden", err); }

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

        const devOptions = [{ value: '', label: '-- Bitte wählen --' }];
        devices.forEach(d => {
            devOptions.push({ value: d.id, label: `${d.name} (${d.id.split('-')[0]}...)` });
        });
        
        const result = await window.Dialog.formWithTable({
            title: 'Neuen Sensor erfassen',
            saveText: 'Hinzufügen',
            tables: [],
            fields: [
                { id: 'name', label: 'Name *', placeholder: 'Eigener Name (z.B. Temperatur Wohnzimmer)', fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', options: locOptions, fullWidth: true },
                { id: 'address', label: 'Master-Gerät (Hardware) *', type: 'select', options: devOptions, fullWidth: true },
                { id: 'ioport', label: 'IO-Port (Channel) *', type: 'select', options: [{value: '', label: '-- Zuerst Gerät wählen --'}], fullWidth: true }
            ],
            onReady: (modal, formElements) => {
                const devSelect = formElements['address'];
                const portSelect = formElements['ioport'];
                devSelect.addEventListener('change', () => {
                    const deviceId = devSelect.value;
                    const selectedDev = devices.find(d => d.id === deviceId);
                    let channels = selectedDev ? (selectedDev.channels || []) : [];
                    const usedPorts = usedPortsMap[deviceId] || new Set();
                    portSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
                    if (Array.isArray(channels) && channels.length > 0) {
                        channels.forEach(ch => {
                            const isUsed = usedPorts.has(String(ch));
                            portSelect.innerHTML += `<option value="${ch}" ${isUsed ? 'disabled' : ''}>${ch}${isUsed ? ' (Belegt)' : ''}</option>`;
                        });
                    } else if (typeof channels === 'number' && channels > 0) {
                        for (let i = 1; i <= channels; i++) {
                            const isUsed = usedPorts.has(String(i));
                            portSelect.innerHTML += `<option value="${i}" ${isUsed ? 'disabled' : ''}>${i}${isUsed ? ' (Belegt)' : ''}</option>`;
                        }
                    }
                });
            }
        });

        if (result) {
            if (!result.name || !result.address || !result.ioport) {
                window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                return;
            }
            
            const newEntry = {
                deviceId: result.address, name: result.name, location: result.location, channel: result.ioport,
                canRead: true, canWrite: false, isSensor: true, isActuator: false, type: 'Sensor', value: '-', unit: '', status: 'active', updated: 'jetzt', timestamp: new Date().toISOString()
            };
            
            const devObj = devices.find(d => d.id === result.address);
            if (devObj) newEntry.deviceName = devObj.name;
                
            try {
                const res = await window.API.addDatapoint(newEntry);
                newEntry.id = res.id;
                this.table._addRow(newEntry);
            } catch (err) {
                window.Dialog.alert('Fehler', 'Fehler beim Speichern im System.', true);
            }
        }
    },

    async showEditModal(row) {
        let devices = [];
        let locations = [];
        let usedPortsMap = {};
        try {
            const [devs, datapoints, locs] = await Promise.all([
                window.API.getDevices(), 
                window.API.getDatapoints(), 
                window.API.getLocations()
            ]);
            devices = devs;
            locations = locs;
            datapoints.forEach(dp => {
                if (dp.deviceId && dp.channel && dp.id !== row.id) {
                    if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                    usedPortsMap[dp.deviceId].add(String(dp.channel));
                }
            });
        } catch(e) {}

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

        const devOptions = [{ value: '', label: '-- Bitte wählen --' }];
        devices.forEach(d => {
            devOptions.push({ value: d.id, label: `${d.name} (${d.id.split('-')[0]}...)` });
        });

        const result = await window.Dialog.formWithTable({
            title: 'Sensor bearbeiten',
            saveText: 'Speichern',
            tables: [],
            fields: [
                { id: 'name', label: 'Name *', value: row.name || '', fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', value: row.location, options: locOptions, fullWidth: true },
                { id: 'address', label: 'Master-Gerät (Hardware) *', type: 'select', value: row.deviceId, options: devOptions, fullWidth: true },
                { id: 'ioport', label: 'IO-Port (Channel) *', type: 'select', value: row.channel, options: [{value: row.channel || '', label: row.channel || '-- Zuerst Gerät wählen --'}], fullWidth: true }
            ],
            onReady: (modal, formElements) => {
                const devSelect = formElements['address'];
                const portSelect = formElements['ioport'];
                
                const updatePorts = () => {
                    const deviceId = devSelect.value;
                    const selectedDev = devices.find(d => d.id === deviceId);
                    let channels = selectedDev ? (selectedDev.channels || []) : [];
                    const usedPorts = usedPortsMap[deviceId] || new Set();
                    
                    const currentVal = portSelect.value;
                    portSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
                    
                    if (Array.isArray(channels) && channels.length > 0) {
                        channels.forEach(ch => {
                            const isUsed = usedPorts.has(String(ch));
                            portSelect.innerHTML += `<option value="${ch}" ${String(ch) === String(currentVal) ? 'selected' : ''} ${isUsed ? 'disabled' : ''}>${ch}${isUsed ? ' (Belegt)' : ''}</option>`;
                        });
                    } else if (typeof channels === 'number' && channels > 0) {
                        for (let i = 1; i <= channels; i++) {
                            const isUsed = usedPorts.has(String(i));
                            portSelect.innerHTML += `<option value="${i}" ${String(i) === String(currentVal) ? 'selected' : ''} ${isUsed ? 'disabled' : ''}>${i}${isUsed ? ' (Belegt)' : ''}</option>`;
                        }
                    }
                };

                devSelect.addEventListener('change', () => { 
                    portSelect.value = ''; 
                    updatePorts(); 
                });
                
                if (devSelect.value) {
                    portSelect.value = row.channel;
                    updatePorts();
                }
            }
        });

        if (result) {
            if (!result.name || !result.address || !result.ioport) {
                window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                return;
            }

            row.name = result.name; 
            row.location = result.location; 
            row.deviceId = result.address; 
            row.channel = result.ioport;
            
            const devObj = devices.find(d => d.id === row.deviceId); 
            if (devObj) row.deviceName = devObj.name;
            
            try { 
                await window.API.updateDatapoint(row.id, row); 
                this.table._render(); 
            } catch (err) { 
                window.Dialog.alert('Fehler', 'Fehler beim Speichern.', true); 
            }
        }
    },

    async deleteSensor(rowId) {
        try {
            await window.API.deleteDatapoint(rowId);
            this.table.data = this.table.data.filter(r => r.id !== rowId);
            this.table.setData(this.table.data);
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            window.Dialog.alert("Fehler", "Löschen fehlgeschlagen.", true);
        }
    }
};