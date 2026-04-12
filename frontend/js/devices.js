/**
 * devices.js – Spezifische Logik für Hardware-Geräte
 */
const DeviceManager = {
    table: null,

    init() {
        const container = document.getElementById('device-table-container');
        if (!container) return;

        const columns = [
            { key: 'id',         label: 'Device-ID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: #6c6c8a;">${val}</span>` },
            { key: 'name',       label: 'Gerätename' },
            { key: 'location',   label: 'Standort' },
            { key: 'busType',    label: 'Netzwerk' },
            { key: 'macAddress', label: 'MAC Adresse', render: (val) => val ? `<span style="font-family: monospace;">${val}</span>` : '—' },
            { key: 'busAddress', label: 'Bus Adresse', render: (val) => val ? `<span style="font-family: monospace;">${val}</span>` : '—' },
            { key: 'status',     label: 'Status', render: (val) => {
                if (val === 'active') return `<span class="badge badge--active">Active</span>`;
                if (val === 'searching') return `<span class="badge badge--searching">Searching... ⏳</span>`;
                if (val === 'not_reachable') return `<span class="badge badge--error">Not Reachable ❌</span>`;
                if (val === 'warning') return `<span class="badge badge--warning">Warning</span>`;
                return `<span class="badge badge--inactive">${val || 'Unknown'}</span>`;
            }},
            { key: 'health',     label: 'Health', render: (_, row) => {
                let html = '';
                if (row.battery !== undefined && row.battery !== null) {
                    const bColor = row.battery <= 20 ? '#e64553' : (row.battery <= 50 ? '#f9e2af' : '#a6e3a1');
                    html += `<span title="Batterie: ${row.battery}%" style="color: ${bColor}; font-size: 0.85em; margin-right: 8px;">🔋 ${row.battery}%</span>`;
                }
                if (row.signal !== undefined && row.signal !== null) {
                    const sColor = row.signal <= 40 ? '#e64553' : (row.signal <= 70 ? '#f9e2af' : '#a6e3a1');
                    html += `<span title="Signalstärke: ${row.signal}%" style="color: ${sColor}; font-size: 0.85em;">📶 ${row.signal}%</span>`;
                }
                return html !== '' ? html : '<span style="color: #6c6c8a;">—</span>';
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

                if (channelsArray.length === 0) return '<span style="color: #6c6c8a;">—</span>';

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
            const [devices, sensors, actuators] = await Promise.all([
                window.API.getDevices(),
                window.API.getSensors(),
                window.API.getActuators()
            ]);
            const allDatapoints = [...sensors, ...actuators];
            const mergedDevices = devices.map(device => {
                const deviceDatapoints = allDatapoints.filter(dp => dp.deviceId === device.id);
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
        
        const modal = document.createElement('div');
        modal.className = 'table-modal';
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Neues Hardware-Gerät erfassen</h3>
                <p>Das System sucht anschliessend im Hintergrund nach dem Gerät.</p>
                <div class="settings-group">
                    <label>Name *</label>
                    <input type="text" id="modal-name" placeholder="Eigener Name (z.B. Deckenlampe)">
                </div>
                <div class="settings-group">
                    <label>Standort</label>
                    <select id="modal-location">
                        <option value="">-- Nicht zugewiesen --</option>
                        ${locations.map(bldg => `
                            <option value="${bldg.name}">🏢 ${bldg.name}</option>
                            ${(bldg.floors || []).map(floor => `
                                <option value="${floor.name}">&nbsp;&nbsp;🟰 ${floor.name}</option>
                                ${(floor.rooms || []).map(room => `<option value="${room.name}">&nbsp;&nbsp;&nbsp;&nbsp;🚪 ${room.name}</option>`).join('')}
                            `).join('')}
                        `).join('')}
                    </select>
                </div>
                <div class="settings-group">
                    <label>MAC- oder Bus-Adresse *</label>
                    <input type="text" id="modal-address" placeholder="z.B. AA:BB:CC... oder 0x05">
                </div>
                <div class="settings-group">
                    <label>Netzwerk (Bus) *</label>
                    <select id="modal-bustype">
                        <option value="WIFI">WIFI</option>
                        <option value="Thread">Thread</option>
                        <option value="RS485">RS485</option>
                        <option value="Ethernet">Ethernet</option>
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
        
        const msgEl = modal.querySelector('#modal-msg');
        const btnConfirm = modal.querySelector('#modal-confirm');

        btnConfirm.onclick = async () => {
            const name = modal.querySelector('#modal-name').value.trim();
            const location = modal.querySelector('#modal-location').value;
            const address = modal.querySelector('#modal-address').value.trim();
            const busType = modal.querySelector('#modal-bustype').value;

            if (!name || !address) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = '✖ Bitte alle Pflichtfelder (*) ausfüllen.';
                return;
            }

            btnConfirm.disabled = true;
            const newId = typeof generateUUID === 'function' ? generateUUID() : '00000000-0000-0000-0000-000000000000';
            
            const newEntry = {
                id: newId, timestamp: new Date().toISOString(), name: name, location: location, status: 'searching', updated: 'jetzt',
                macAddress: address.includes(':') ? address : '',
                busAddress: !address.includes(':') ? address : '',
                busType: busType, health: '—', battery: null, signal: null, channels: []
            };

            try {
                await window.API.addDevice(newEntry);
                this.table._addRow(newEntry);
                modal.remove();
                this.triggerSearch(newEntry);
            } catch (err) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = `✖ Fehler beim Speichern im System.`;
                btnConfirm.disabled = false;
            }
        };
    },

    async showEditModal(row) {
        let locations = [];
        try { locations = await window.API.getLocations(); } catch(e) {}
        
        const modal = document.createElement('div');
        modal.className = 'table-modal';
        const addrValue = row.macAddress || row.busAddress || '';
        
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Gerät bearbeiten</h3>
                <div class="settings-group"><label>Name</label><input type="text" id="edit-name" value="${row.name || ''}"></div>
                <div class="settings-group">
                    <label>Standort</label>
                    <select id="edit-location">
                        <option value="">-- Nicht zugewiesen --</option>
                        ${locations.map(bldg => `
                            <option value="${bldg.name}" ${row.location === bldg.name ? 'selected' : ''}>🏢 ${bldg.name}</option>
                            ${(bldg.floors || []).map(floor => `
                                <option value="${floor.name}" ${row.location === floor.name ? 'selected' : ''}>&nbsp;&nbsp;🟰 ${floor.name}</option>
                                ${(floor.rooms || []).map(room => `<option value="${room.name}" ${row.location === room.name ? 'selected' : ''}>&nbsp;&nbsp;&nbsp;&nbsp;🚪 ${room.name}</option>`).join('')}
                            `).join('')}
                        `).join('')}
                    </select>
                </div>
                <div class="settings-group"><label>MAC- oder Bus-Adresse</label><input type="text" id="edit-address" value="${addrValue}"></div>
                <div class="settings-group">
                    <label>Netzwerk (Bus)</label>
                    <select id="edit-bustype">
                        <option value="WIFI" ${row.busType === 'WIFI' ? 'selected' : ''}>WIFI</option>
                        <option value="Thread" ${row.busType === 'Thread' ? 'selected' : ''}>Thread</option>
                        <option value="RS485" ${row.busType === 'RS485' ? 'selected' : ''}>RS485</option>
                        <option value="Ethernet" ${row.busType === 'Ethernet' ? 'selected' : ''}>Ethernet</option>
                    </select>
                </div>
                <div id="edit-msg" class="modal-msg"></div>
                <div class="table-modal-actions"><button id="edit-cancel">Abbrechen</button><button id="edit-confirm" class="btn-add">Speichern & Suchen</button></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#edit-cancel').onclick = () => modal.remove();

        const msgEl = modal.querySelector('#edit-msg');
        const btnConfirm = modal.querySelector('#edit-confirm');

        btnConfirm.onclick = async () => {
            const newName = modal.querySelector('#edit-name').value.trim();
            const newAddr = modal.querySelector('#edit-address').value.trim();
            if (!newName || !newAddr) { msgEl.className = 'modal-msg error'; msgEl.innerHTML = '✖ Bitte alle Pflichtfelder ausfüllen.'; return; }
            
            btnConfirm.disabled = true;
            row.name = newName; row.location = modal.querySelector('#edit-location').value;
            row.macAddress = newAddr.includes(':') ? newAddr : ''; row.busAddress = !newAddr.includes(':') ? newAddr : '';
            row.busType = modal.querySelector('#edit-bustype').value;

            try { await window.API.updateDevice(row.id, row); this.table._render(); modal.remove(); this.triggerSearch(row); } 
            catch (err) { msgEl.className = 'modal-msg error'; msgEl.innerHTML = `✖ Fehler beim Speichern.`; btnConfirm.disabled = false; }
        };
    },

    async deleteDevice(rowId) {
        try {
            await window.API.deleteDevice(rowId);
            this.table.data = this.table.data.filter(r => r.id !== rowId);
            this.table.setData(this.table.data);
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            alert("Löschen fehlgeschlagen.");
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