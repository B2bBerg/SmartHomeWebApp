/**
 * datapoint.js – Generisches Modul für die Verwaltung von Datenpunkten (Sensoren & Aktoren)
 */
class DatapointManager {
    constructor(config) {
        this.mode = config.mode; // 'sensor' oder 'actuator'
        this.containerId = config.containerId;
        this.title = config.title; // 'Sensor' oder 'Aktor'
        this.table = null;
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const columns = [
            { key: 'id',         label: 'UUID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">${val || '—'}</span>` },
            { key: 'name',       label: 'Datenpunkt' },
            { key: 'deviceName', label: 'Gerät (Hardware)', render: (val) => val ? `<span style="color: #89b4fa;">${val}</span>` : '—' },
            { key: 'type',       label: 'Typ' },
            { key: 'location',   label: 'Standort' },
            { key: 'channel',    label: 'IO-Port', render: (val) => val ? `<span class="io-port io-port--assigned">${val}</span>` : '—' },
            { key: 'value',      label: this.mode === 'actuator' ? 'Wert / Zustand' : 'Wert', render: (val, row) => (val !== undefined ? val : (row.state !== undefined ? row.state : '—')) },
            { key: 'unit',       label: 'Einheit' },
            { key: 'updated',    label: 'Letztes Update' }
        ];

        const addIconStr = this.mode === 'sensor' ? 'mobile-signal-out-svgrepo-com.svg' : 'mobile-signal-svgrepo-com.svg';

        this.table = new DataTable(container, columns, {
            searchable: true,
            addBtnClass: this.mode === 'sensor' ? 'btn-add btn-add-sensor' : 'btn-add btn-add-actuator',
            addBtnHtml: `<span><img src="assets/icons/${addIconStr}"></span> ${this.title} hinzufügen`,
            onAdd: () => this.showAddModal(),
            onEdit: (row) => this.showEditModal(row),
            onDelete: (rowId) => this.deleteDatapoint(rowId)
        });

        this.loadData();
    }

    async loadData() {
        try {
            const [datapoints, devices] = await Promise.all([window.API.getDatapoints(), window.API.getDevices()]);
            const filteredDPs = datapoints.filter(dp => {
                if (this.mode === 'actuator') return dp.isActuator || dp.canWrite;
                return dp.isSensor || (dp.canRead && !dp.canWrite);
            });
            const mergedData = filteredDPs.map(dp => {
                const dev = devices.find(d => d.id === dp.deviceId) || {};
                return { ...dev, ...dp, id: dp.id, deviceName: dev.name };
            });
            this.table.setData(mergedData);
        } catch (err) {
            console.error(`Fehler beim Laden der ${this.title}en:`, err);
        }
    }

    isPortCompatible(ch) {
        const chStr = String(ch).toUpperCase();
        if (this.mode === 'actuator') {
            return !chStr.startsWith('AI') && !chStr.startsWith('DI'); // Keine Sensoren an Aktoren
        } else {
            return !chStr.startsWith('AO') && !chStr.startsWith('DO'); // Keine Aktoren an Sensoren
        }
    }

    getPortDisabledReason(ch) {
        if (this.isPortCompatible(ch)) return null;
        return this.mode === 'actuator' ? '(Nur Sensor)' : '(Nur Aktor)';
    }

    async getFormDependencies(excludeRowId = null) {
        let devices = [], locations = [], usedPortsMap = {};
        try {
            const [devs, datapoints, locs] = await Promise.all([
                window.API.getDevices(),
                window.API.getDatapoints(),
                window.API.getLocations()
            ]);
            devices = devs;
            locations = locs;
            datapoints.forEach(dp => {
                if (dp.deviceId && dp.channel && dp.id !== excludeRowId) {
                    if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                    usedPortsMap[dp.deviceId].add(String(dp.channel));
                }
            });
        } catch (err) { console.error("Konnte Daten nicht laden", err); }
        return { devices, locations, usedPortsMap };
    }

    buildLocationOptions(locations) {
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
    }

    getValidDevices(devices, usedPortsMap) {
        return devices.filter(r => {
            const channels = r.channels || r.ports || [];
            const used = usedPortsMap[r.id] || new Set();
            let validChannels = [];
            if (Array.isArray(channels)) {
                validChannels = channels.filter(ch => this.isPortCompatible(ch));
            } else if (typeof channels === 'number') {
                validChannels = Array.from({length: channels}, (_, i) => i + 1);
            }
            const total = validChannels.length;
            const free = total - validChannels.filter(ch => used.has(String(ch))).length;
            return total > 0 && free > 0;
        });
    }

    async showAddModal() {
        const { devices, locations, usedPortsMap } = await this.getFormDependencies();
        const locOptions = this.buildLocationOptions(locations);
        const validDevices = this.getValidDevices(devices, usedPortsMap);

        const devOptions = [{ value: '', label: '-- Bitte wählen --' }];
        validDevices.forEach(d => devOptions.push({ value: d.id, label: `${d.name} (${d.id.split('-')[0]}...)` }));
        
        const result = await window.Dialog.formWithTable({
            title: `Neuen ${this.title} erfassen`,
            saveText: 'Hinzufügen',
            fields: [
                { id: 'name', label: 'Name *', placeholder: `Eigener Name (z.B. ${this.mode === 'actuator' ? 'Deckenlampe' : 'Temperatur Wohnzimmer'})`, fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', options: locOptions, fullWidth: true },
                { id: 'deviceSearch', label: 'Hardware filtern 🔍', placeholder: 'Name oder MAC/Bus-Adresse...', fullWidth: true },
                { id: 'address', label: 'Master-Gerät (Hardware) *', type: 'select', options: devOptions, fullWidth: false },
                { id: 'ioport', label: 'IO-Port (Channel) *', type: 'select', options: [{value: '', label: '-- Zuerst Gerät wählen --'}], fullWidth: false }
            ],
            tables: [
                {
                    id: 'deviceList',
                    title: '🔍 Registrierte Hardware-Geräte',
                    columns: [
                        { key: 'name', label: 'Gerätename' },
                        { key: 'location', label: 'Standort', render: (val) => val || '—' },
                        { key: 'busType', label: 'Netzwerk', render: (val) => val || '—' },
                        { key: 'address', label: 'Adresse', render: (val, r) => r.macAddress || r.busAddress || '—' },
                        { key: 'ports', label: 'IO-Ports (Frei)', render: (val, r) => {
                            const channels = r.channels || r.ports || [];
                            const used = usedPortsMap[r.id] || new Set();
                            let validChannels = [];
                            if (Array.isArray(channels)) {
                                validChannels = channels.filter(ch => this.isPortCompatible(ch));
                            } else if (typeof channels === 'number') {
                                validChannels = Array.from({length: channels}, (_, i) => i + 1);
                            }
                            const total = validChannels.length;
                            const free = total - validChannels.filter(ch => used.has(String(ch))).length;
                            return `<span style="color: var(--accent-green);">${free}/${total} frei</span>`;
                        }}
                    ],
                    data: [],
                    onRowSelect: (selectedRow, fields) => {
                        fields.address.value = selectedRow.id;
                        fields.address.dispatchEvent(new Event('change'));
                    }
                }
            ],
            onReady: (modal, formElements, updateTableData, switchToTab, filterTable) => {
                const searchInput = formElements['deviceSearch'];
                const devSelect = formElements['address'];
                const portSelect = formElements['ioport'];

                const applyFilter = () => {
                    const query = searchInput.value.trim().toLowerCase();
                    const filtered = validDevices.filter(d => {
                        const addr = d.macAddress || d.busAddress || '';
                        const name = d.name || '';
                        return name.toLowerCase().includes(query) || addr.toLowerCase().includes(query);
                    });
                    updateTableData('deviceList', filtered);
                };

                updateTableData('deviceList', validDevices);

                searchInput.addEventListener('input', () => {
                    switchToTab('deviceList');
                    applyFilter();
                });

                devSelect.addEventListener('change', () => {
                    const deviceId = devSelect.value;
                    const selectedDev = devices.find(d => d.id === deviceId);
                    let channels = selectedDev ? (selectedDev.channels || selectedDev.ports || []) : [];
                    const usedPorts = usedPortsMap[deviceId] || new Set();
                    portSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
                    if (Array.isArray(channels) && channels.length > 0) {
                        channels.forEach(ch => {
                            const isUsed = usedPorts.has(String(ch));
                            const disabledReason = this.getPortDisabledReason(ch);
                            if (disabledReason) {
                                portSelect.innerHTML += `<option value="${ch}" disabled>${ch} ${disabledReason}</option>`;
                            } else {
                                portSelect.innerHTML += `<option value="${ch}" ${isUsed ? 'disabled' : ''}>${ch}${isUsed ? ' (Belegt)' : ''}</option>`;
                            }
                        });
                    } else if (typeof channels === 'number' && channels > 0) {
                        for (let i = 1; i <= channels; i++) {
                            const isUsed = usedPorts.has(String(i));
                            portSelect.innerHTML += `<option value="${i}" ${isUsed ? 'disabled' : ''}>${i}${isUsed ? ' (Belegt)' : ''}</option>`;
                        }
                    }
                });
            },
            validate: (res) => {
                if (!res.name || !res.address || !res.ioport) {
                    window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                    return false;
                }
                return true;
            }
        });

        if (result) {
            const newEntry = {
                deviceId: result.address, name: result.name, location: result.location, channel: result.ioport,
                canRead: true, canWrite: this.mode === 'actuator', 
                isSensor: this.mode === 'sensor', isActuator: this.mode === 'actuator', 
                type: this.title, unit: '', status: 'active', updated: 'jetzt', timestamp: new Date().toISOString()
            };
            if (this.mode === 'actuator') newEntry.state = '-';
            else newEntry.value = '-';
            
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
    }

    async showEditModal(row) {
        const { devices, locations, usedPortsMap } = await this.getFormDependencies(row.id);
        const locOptions = this.buildLocationOptions(locations);
        const validDevices = this.getValidDevices(devices, usedPortsMap);

        const devOptions = [{ value: '', label: '-- Bitte wählen --' }];
        validDevices.forEach(d => devOptions.push({ value: d.id, label: `${d.name} (${d.id.split('-')[0]}...)` }));

        const result = await window.Dialog.formWithTable({
            title: `${this.title} bearbeiten`,
            saveText: 'Speichern',
            fields: [
                { id: 'name', label: 'Name *', value: row.name || '', fullWidth: true },
                { id: 'location', label: 'Standort', type: 'select', value: row.location, options: locOptions, fullWidth: true },
                { id: 'deviceSearch', label: 'Hardware filtern 🔍', placeholder: 'Name oder MAC/Bus-Adresse...', fullWidth: true },
                { id: 'address', label: 'Master-Gerät (Hardware) *', type: 'select', value: row.deviceId, options: devOptions, fullWidth: false },
                { id: 'ioport', label: 'IO-Port (Channel) *', type: 'select', value: row.channel, options: [{value: row.channel || '', label: row.channel || '-- Zuerst Gerät wählen --'}], fullWidth: false }
            ],
            tables: [
                {
                    id: 'deviceList',
                    title: '🔍 Registrierte Hardware-Geräte',
                    columns: [
                        { key: 'name', label: 'Gerätename' },
                        { key: 'location', label: 'Standort', render: (val) => val || '—' },
                        { key: 'busType', label: 'Netzwerk', render: (val) => val || '—' },
                        { key: 'address', label: 'Adresse', render: (val, r) => r.macAddress || r.busAddress || '—' },
                        { key: 'ports', label: 'IO-Ports (Frei)', render: (val, r) => {
                            const channels = r.channels || r.ports || [];
                            const used = usedPortsMap[r.id] || new Set();
                            let validChannels = [];
                            if (Array.isArray(channels)) {
                                validChannels = channels.filter(ch => this.isPortCompatible(ch));
                            } else if (typeof channels === 'number') {
                                validChannels = Array.from({length: channels}, (_, i) => i + 1);
                            }
                            const total = validChannels.length;
                            const free = total - validChannels.filter(ch => used.has(String(ch))).length;
                            return `<span style="color: var(--accent-green);">${free}/${total} frei</span>`;
                        }}
                    ],
                    data: [],
                    onRowSelect: (selectedRow, fields) => {
                        fields.address.value = selectedRow.id;
                        fields.address.dispatchEvent(new Event('change'));
                    }
                }
            ],
            onReady: (modal, formElements, updateTableData, switchToTab, filterTable) => {
                const searchInput = formElements['deviceSearch'];
                const devSelect = formElements['address'];
                const portSelect = formElements['ioport'];
                
                const applyFilter = () => {
                    const query = searchInput.value.trim().toLowerCase();
                    const filtered = validDevices.filter(d => {
                        const addr = d.macAddress || d.busAddress || '';
                        const name = d.name || '';
                        return name.toLowerCase().includes(query) || addr.toLowerCase().includes(query);
                    });
                    updateTableData('deviceList', filtered);
                };

                updateTableData('deviceList', validDevices);

                searchInput.addEventListener('input', () => {
                    switchToTab('deviceList');
                    applyFilter();
                });

                const updatePorts = () => {
                    const deviceId = devSelect.value;
                    const selectedDev = devices.find(d => d.id === deviceId);
                    let channels = selectedDev ? (selectedDev.channels || selectedDev.ports || []) : [];
                    const usedPorts = usedPortsMap[deviceId] || new Set();
                    
                    const currentVal = portSelect.value; 
                    portSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
                    
                    if (Array.isArray(channels) && channels.length > 0) {
                        channels.forEach(ch => {
                            const isUsed = usedPorts.has(String(ch));
                            const disabledReason = this.getPortDisabledReason(ch);
                            if (disabledReason) {
                                portSelect.innerHTML += `<option value="${ch}" disabled>${ch} ${disabledReason}</option>`;
                            } else {
                                portSelect.innerHTML += `<option value="${ch}" ${String(ch) === String(currentVal) ? 'selected' : ''} ${isUsed ? 'disabled' : ''}>${ch}${isUsed ? ' (Belegt)' : ''}</option>`;
                            }
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
            },
            validate: (res) => {
                if (!res.name || !res.address || !res.ioport) {
                    window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder (*) ausfüllen.', true);
                    return false;
                }
                return true;
            }
        });

        if (result) {
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
    }

    async deleteDatapoint(rowId) {
        try {
            await window.API.deleteDatapoint(rowId);
            this.table.data = this.table.data.filter(r => r.id !== rowId);
            this.table.setData(this.table.data);
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            window.Dialog.alert("Fehler", "Löschen fehlgeschlagen.", true);
        }
    }
}

window.DatapointManager = DatapointManager;