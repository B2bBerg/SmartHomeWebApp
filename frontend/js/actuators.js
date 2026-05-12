/**
 * actuators.js – Spezifische Logik für Aktoren (Datenpunkte)
 */
const ActuatorManager = {
    table: null,

    init() {
        const container = document.getElementById('actuator-table-container');
        if (!container) return;

        const columns = [
            { key: 'id',         label: 'UUID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: var(--text-secondary);">${val || '—'}</span>` },
            { key: 'name',       label: 'Datenpunkt' },
            { key: 'deviceName', label: 'Gerät (Hardware)', render: (val) => val ? `<span style="color: #89b4fa;">${val}</span>` : '—' },
            { key: 'type',       label: 'Typ' },
            { key: 'location',   label: 'Standort' },
            { key: 'channel',    label: 'IO-Port', render: (val) => val ? `<span class="io-port io-port--assigned">${val}</span>` : '—' },
            { key: 'value',      label: 'Wert' },
            { key: 'unit',       label: 'Einheit' },
            { key: 'updated',    label: 'Letztes Update' }
        ];

        this.table = new DataTable(container, columns, {
            searchable: true,
            onAdd: () => this.showAddModal(),
            onEdit: (row) => this.showEditModal(row),
            onDelete: (rowId) => this.deleteActuator(rowId)
        });

        this.loadData();
    },

    async loadData() {
        try {
            const [actuators, devices] = await Promise.all([window.API.getActuators(), window.API.getDevices()]);
            const mergedData = actuators.map(a => {
                const dev = devices.find(d => d.id === a.deviceId) || {};
                return { ...dev, ...a, id: a.id, deviceName: dev.name };
            });
            this.table.setData(mergedData);
        } catch (err) {
            console.error("Fehler beim Laden der Aktoren:", err);
        }
    },

    async showAddModal() {
        let devices = [];
        let locations = [];
        let usedPortsMap = {};
        try {
            const [devs, sensors, actuators, locs] = await Promise.all([
                window.API.getDevices(),
                window.API.getSensors(),
                window.API.getActuators(),
                window.API.getLocations()
            ]);
            devices = devs;
            locations = locs;
            const allDatapoints = [...sensors, ...actuators];
            allDatapoints.forEach(dp => {
                if (dp.deviceId && dp.channel) {
                    if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                    usedPortsMap[dp.deviceId].add(String(dp.channel));
                }
            });
        } catch (err) { console.error("Konnte Daten nicht laden", err); }

        const modal = document.createElement('div');
        modal.className = 'table-modal';
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Neuen Aktor erfassen</h3>
                <p>Suchen Sie das Master-Gerät (Hardware) für den neuen Datenpunkt:</p>
                <div class="settings-group">
                    <label>Name *</label>
                    <input type="text" id="modal-name" placeholder="Eigener Name (z.B. Deckenlampe)">
                </div>
                <div class="settings-group">
                    <label>Standort</label>
                    <select id="modal-location">
                        <option value="">-- Nicht zugewiesen --</option>
                        ${locations.map(bldg => 
                            (bldg.floors || []).map(floor => 
                                `<optgroup label="${bldg.name} - ${floor.name}">
                                    ${(floor.rooms || []).map(room => `<option value="${room.name}">${room.name}</option>`).join('')}
                                </optgroup>`
                            ).join('')
                        ).join('')}
                    </select>
                </div>
                <div class="settings-group">
                    <label>Master-Gerät (Hardware) *</label>
                    <select id="modal-address">
                        <option value="">-- Bitte wählen --</option>
                        ${devices.map(d => `<option value="${d.id}" data-channels="${JSON.stringify(d.channels || []).replace(/"/g, '&quot;')}">${d.name} (${d.id.split('-')[0]}...)</option>`).join('')}
                    </select>
                </div>
                <div class="settings-group">
                    <label>IO-Port (Channel) *</label>
                    <select id="modal-ioport">
                        <option value="">-- Zuerst Gerät wählen --</option>
                    </select>
                </div>
                <div id="modal-msg" class="modal-msg"></div>
                <div class="table-modal-actions">
                    <button id="modal-cancel">Abbrechen</button>
                    <button id="modal-confirm" class="btn-add">Hinzufügen</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#modal-cancel').onclick = () => modal.remove();
        
        const devSelect = modal.querySelector('#modal-address');
        const portSelect = modal.querySelector('#modal-ioport');
        devSelect.addEventListener('change', () => {
            const selectedOpt = devSelect.options[devSelect.selectedIndex];
            const deviceId = selectedOpt ? selectedOpt.value : null;
            let channels = [];
            if (selectedOpt && selectedOpt.dataset.channels) {
                try { channels = JSON.parse(selectedOpt.dataset.channels); } catch(e) {}
            }
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
        
        const msgEl = modal.querySelector('#modal-msg');
        const btnConfirm = modal.querySelector('#modal-confirm');

        btnConfirm.onclick = async () => {
            const name = modal.querySelector('#modal-name').value.trim();
            const location = modal.querySelector('#modal-location').value;
            const address = modal.querySelector('#modal-address').value.trim();
            const port = modal.querySelector('#modal-ioport').value.trim();

            if (!name || !address || !port) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = '✖ Bitte alle Pflichtfelder (*) ausfüllen.';
                return;
            }

            btnConfirm.disabled = true;
            
            const newEntry = {
                deviceId: address, name: name, location: location, channel: port,
                isSensor: false, isActuator: true, type: 'Aktor', value: '-', unit: '', status: 'active', updated: 'jetzt', timestamp: new Date().toISOString()
            };
            
            const devObj = devices.find(d => d.id === address);
            if (devObj) newEntry.deviceName = devObj.name;
                
            try {
                const res = await window.API.addActuator(newEntry);
                newEntry.id = res.id;
                this.table._addRow(newEntry);
                modal.remove();
            } catch (err) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = `✖ Fehler beim Speichern im System.`;
                btnConfirm.disabled = false;
            }
        };
    },

    async showEditModal(row) {
        let devices = [];
        let locations = [];
        let usedPortsMap = {};
        try {
            const [devs, sensors, actuators, locs] = await Promise.all([window.API.getDevices(), window.API.getSensors(), window.API.getActuators(), window.API.getLocations()]);
            devices = devs;
            locations = locs;
            [...sensors, ...actuators].forEach(dp => {
                if (dp.deviceId && dp.channel && dp.id !== row.id) {
                    if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                    usedPortsMap[dp.deviceId].add(String(dp.channel));
                }
            });
        } catch(e) {}

        const modal = document.createElement('div');
        modal.className = 'table-modal';
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Aktor bearbeiten</h3>
                <div class="settings-group"><label>Name</label><input type="text" id="edit-name" value="${row.name || ''}"></div>
                <div class="settings-group"><label>Standort</label><select id="edit-location"><option value="">-- Nicht zugewiesen --</option>
                ${locations.map(bldg => 
                    (bldg.floors || []).map(floor => 
                        `<optgroup label="${bldg.name} - ${floor.name}">${(floor.rooms || []).map(room => `<option value="${room.name}" ${row.location === room.name ? 'selected' : ''}>${room.name}</option>`).join('')}</optgroup>`
                    ).join('')
                ).join('')}
                </select></div>
                <div class="settings-group"><label>Master-Gerät (Hardware)</label><select id="edit-address"><option value="">-- Bitte wählen --</option>${devices.map(d => `<option value="${d.id}" data-channels="${JSON.stringify(d.channels || []).replace(/"/g, '&quot;')}" ${d.id === row.deviceId ? 'selected' : ''}>${d.name} (${d.id.split('-')[0]}...)</option>`).join('')}</select></div>
                <div class="settings-group"><label>IO-Port (Channel)</label><select id="edit-ioport"><option value="">-- Zuerst Gerät wählen --</option></select></div>
                <div id="edit-msg" class="modal-msg"></div>
                <div class="table-modal-actions"><button id="edit-cancel">Abbrechen</button><button id="edit-confirm" class="btn-add">Speichern</button></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#edit-cancel').onclick = () => modal.remove();
        
        const devSelect = modal.querySelector('#edit-address');
        const portSelect = modal.querySelector('#edit-ioport');
        const updatePorts = () => {
            const selectedOpt = devSelect.options[devSelect.selectedIndex];
            let channels = [];
            if (selectedOpt && selectedOpt.dataset.channels) { try { channels = JSON.parse(selectedOpt.dataset.channels); } catch(e) {} }
            const usedPorts = usedPortsMap[selectedOpt ? selectedOpt.value : null] || new Set();
            portSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
            if (Array.isArray(channels) && channels.length > 0) channels.forEach(ch => portSelect.innerHTML += `<option value="${ch}" ${ch === row.channel ? 'selected' : ''} ${usedPorts.has(String(ch)) ? 'disabled' : ''}>${ch}${usedPorts.has(String(ch)) ? ' (Belegt)' : ''}</option>`);
            else if (typeof channels === 'number' && channels > 0) for (let i = 1; i <= channels; i++) portSelect.innerHTML += `<option value="${i}" ${String(i) === String(row.channel) ? 'selected' : ''} ${usedPorts.has(String(i)) ? 'disabled' : ''}>${i}${usedPorts.has(String(i)) ? ' (Belegt)' : ''}</option>`;
        };
        devSelect.addEventListener('change', () => { row.channel = null; updatePorts(); });
        updatePorts();

        const msgEl = modal.querySelector('#edit-msg');
        const btnConfirm = modal.querySelector('#edit-confirm');
        btnConfirm.onclick = async () => {
            if (!modal.querySelector('#edit-name').value.trim() || !modal.querySelector('#edit-address').value.trim()) { msgEl.className = 'modal-msg error'; msgEl.innerHTML = '✖ Bitte alle Pflichtfelder ausfüllen.'; return; }
            btnConfirm.disabled = true;
            row.name = modal.querySelector('#edit-name').value.trim(); row.location = modal.querySelector('#edit-location').value; row.deviceId = modal.querySelector('#edit-address').value.trim(); row.channel = modal.querySelector('#edit-ioport').value.trim();
            const devObj = devices.find(d => d.id === row.deviceId); if (devObj) row.deviceName = devObj.name;
            try { await window.API.updateActuator(row.id, row); this.table._render(); modal.remove(); } 
            catch (err) { msgEl.className = 'modal-msg error'; msgEl.innerHTML = `✖ Fehler beim Speichern.`; btnConfirm.disabled = false; }
        };
    },

    async deleteActuator(rowId) {
        try {
            await window.API.deleteActuator(rowId);
            this.table.data = this.table.data.filter(r => r.id !== rowId);
            this.table.setData(this.table.data);
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            window.Dialog.alert("Fehler", "Löschen fehlgeschlagen.", true);
        }
    }
};