/**
 * table.js – Generische Tabellen-Komponente mit Add/Delete/Edit Funktionalität
 * Ersetzt die alte data-table.js komplett.
 */
class DataTable {
    constructor(container, columns, options = {}) {
        this.container = container;
        this.options   = options;
        
        this.columns = [...columns];
        // Füge "Actions" Spalte nur hinzu, wenn nicht explizit deaktiviert
        if (this.options.hasActions !== false) {
            this.columns.push({ 
                key: 'actions', 
                label: 'Aktionen', 
                render: (v, row) => `
                    <button class="btn-icon btn-edit" title="Name bearbeiten">✎</button>
                    <button class="btn-icon btn-delete" title="Löschen">🗑</button>
                ` 
            });
        }
        
        this.data      = [];
        this.filtered  = [];
        this.sortKey   = null;
        this.sortAsc   = true;
        this._build();
    }

    setData(rows) {
        this.data     = rows;
        this.filtered = [...rows];
        this._applySort();
        this._render();
    }

    _build() {
        this.container.innerHTML = '';

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'data-table-toolbar';

        if (this.options.hasAdd !== false) {
            // ADD BUTTON
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add';
            addBtn.innerHTML = '<span>+</span> Hinzufügen';
            addBtn.onclick = () => this._showAddModal();
            toolbar.appendChild(addBtn);
        }

        if (this.options.searchable !== false) {
            this.searchInput = document.createElement('input');
            this.searchInput.className   = 'data-table-search';
            this.searchInput.placeholder = 'Suchen...';
            this.searchInput.addEventListener('input', () => this._onSearch());
            toolbar.appendChild(this.searchInput);
        }

        this.countEl = document.createElement('span');
        this.countEl.className = 'data-table-count';
        toolbar.appendChild(this.countEl);
        this.container.appendChild(toolbar);

        // Table Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'data-table-wrapper';
        this.table = document.createElement('table');
        this.table.className = 'data-table';

        // Head
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.dataset.key = col.key;
            th.innerHTML = `${col.label} ${col.key !== 'actions' ? '<span class="sort-icon">⇅</span>' : ''}`;
            if(col.key !== 'actions') th.addEventListener('click', () => this._onSort(col.key, th));
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        this.table.appendChild(thead);

        this.tbody = document.createElement('tbody');
        this.table.appendChild(this.tbody);
        wrapper.appendChild(this.table);
        this.container.appendChild(wrapper);
    }

    async _showAddModal() {
        const isDev = this.options.isDevice;
        let devices = [];
        let usedPortsMap = {};
        if (!isDev) {
            try {
                const [devs, sensors, actuators] = await Promise.all([
                    window.API.getDevices(),
                    window.API.getSensors(),
                    window.API.getActuators()
                ]);
                devices = devs;
                const allDatapoints = [...sensors, ...actuators];
                allDatapoints.forEach(dp => {
                    if (dp.deviceId && dp.channel) {
                        if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                        usedPortsMap[dp.deviceId].add(String(dp.channel));
                    }
                });
            } catch (err) { console.error("Konnte Daten nicht laden", err); }
        }

        const modal = document.createElement('div');
        modal.className = 'table-modal';
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Neues Objekt erfassen</h3>
                <p>Geben Sie die Konfiguration ein. ${isDev ? 'Das System wird anschliessend im Hintergrund nach dem Gerät suchen.' : ''}</p>
                <div class="settings-group">
                    <label>Name *</label>
                    <input type="text" id="modal-name" placeholder="Eigener Name (z.B. Deckenlampe)">
                </div>
                <div class="settings-group">
                    <label>Standort (Apartment)</label>
                    <select id="modal-location">
                        <option value="">-- Wird später konfiguriert --</option>
                        <option value="Wohnzimmer">Wohnzimmer</option>
                        <option value="Küche">Küche</option>
                        <option value="Bedroom">Bedroom</option>
                        <option value="Living Room">Living Room</option>
                    </select>
                </div>
                ${isDev ? `
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
                ` : `
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
                `}
                <div id="modal-msg" class="modal-msg"></div>
                <div class="table-modal-actions">
                    <button id="modal-cancel">Abbrechen</button>
                    <button id="modal-confirm" class="btn-add">Hinzufügen</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#modal-cancel').onclick = () => modal.remove();
        
        if (!isDev) {
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
        }
        
        const msgEl = modal.querySelector('#modal-msg');
        const btnConfirm = modal.querySelector('#modal-confirm');

        modal.querySelector('#modal-confirm').onclick = async () => {
            const name = modal.querySelector('#modal-name').value.trim();
            const location = modal.querySelector('#modal-location').value;
            const address = modal.querySelector('#modal-address').value.trim();
            const port = !isDev ? modal.querySelector('#modal-ioport').value.trim() : null;
            const busType = isDev ? modal.querySelector('#modal-bustype').value : null;

            if (!name || !address || (!isDev && !port)) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = '✖ Bitte alle Pflichtfelder (*) ausfüllen.';
                return;
            }

            btnConfirm.disabled = true;
            const newId = typeof generateUUID === 'function' ? generateUUID() : '00000000-0000-0000-0000-000000000000';
            
            let newEntry = {
                id: newId,
                name: name,
                location: location,
                status: isDev ? 'searching' : 'active',
                updated: 'jetzt'
            };

            if (isDev) {
                newEntry.macAddress = address.includes(':') ? address : '';
                newEntry.busAddress = !address.includes(':') ? address : '';
                newEntry.busType = busType;
                newEntry.health = '—';
                newEntry.battery = null;
                newEntry.signal = null;
                newEntry.channels = [];
            } else {
                newEntry.deviceId = address;
                newEntry.channel = port;
                newEntry.type = this.options.isActuator ? 'Aktor' : 'Sensor';
                newEntry.value = '-';
                newEntry.unit = '';
                const devObj = devices.find(d => d.id === address);
                if (devObj) newEntry.deviceName = devObj.name;
            }
                
            try {
                if (isDev) {
                    await window.API.addDevice(newEntry);
                } else if (this.options.isActuator) {
                    await window.API.addActuator(newEntry);
                } else {
                    await window.API.addSensor(newEntry);
                }
                this._addRow(newEntry);
                modal.remove();
                
                // Hintergrundsuche starten, wenn es ein Gerät ist
                if (isDev) {
                    this._triggerSearch(newEntry);
                }
            } catch (err) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = `✖ Fehler beim Speichern im System.`;
                btnConfirm.disabled = false;
            }
        };
    }

    _triggerSearch(row) {
        // Stelle sicher, dass wir auf der echten Datenreferenz arbeiten
        const index = this.data.findIndex(r => r.id === row.id);
        if (index === -1) return;
        
        this.data[index].status = 'searching';
        this.setData(this.data); // Update UI: Searching...
        
        // Fire & Forget: API-Aufruf blockiert die UI nicht
        (async () => {
            try {
                const addr = this.data[index].macAddress || this.data[index].busAddress || '';
                const bType = this.data[index].busType || '';
                // Wartet nun auf die API (simulierte oder echte Latenz)
                const found = await window.API.scanDevice(addr, bType);
                
                if (found) {
                    this.data[index].status = 'active';
                    this.data[index].health = 'OK';
                    if (found.battery !== undefined) this.data[index].battery = found.battery;
                    if (found.signal !== undefined) this.data[index].signal = found.signal;
                    if (found.channels) this.data[index].channels = found.channels;
                } else {
                    this.data[index].status = 'not_reachable';
                }
            } catch (e) {
                this.data[index].status = 'not_reachable';
            }
            
            // Backend mit neuem Status synchronisieren
            await window.API.updateDevice(this.data[index].id, this.data[index]);
            this.setData(this.data);
        })();
    }

    _addRow(obj) {
        this.data.push(obj);
        this.setData(this.data);
    }

    async _onDelete(rowId) {
        if(confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
            try {
                if (this.options.isDevice) await window.API.deleteDevice(rowId);
                else if (this.options.isActuator) await window.API.deleteActuator(rowId);
                else await window.API.deleteSensor(rowId);
                
                this.data = this.data.filter(r => r.id !== rowId);
                this.setData(this.data);
            } catch (err) {
                console.error("Fehler beim Löschen:", err);
                alert("Löschen fehlgeschlagen.");
            }
        }
    }

    async _onEdit(row) {
        const isDev = this.options.isDevice;
        let devices = [];
        let usedPortsMap = {};
        if (!isDev) {
            try {
                const [devs, sensors, actuators] = await Promise.all([
                    window.API.getDevices(),
                    window.API.getSensors(),
                    window.API.getActuators()
                ]);
                devices = devs;
                const allDatapoints = [...sensors, ...actuators];
                allDatapoints.forEach(dp => {
                    // Den Port der gerade bearbeiteten Zeile nicht als belegt blockieren!
                    if (dp.deviceId && dp.channel && dp.id !== row.id) {
                        if (!usedPortsMap[dp.deviceId]) usedPortsMap[dp.deviceId] = new Set();
                        usedPortsMap[dp.deviceId].add(String(dp.channel));
                    }
                });
            } catch(e) {}
        }
        const modal = document.createElement('div');
        modal.className = 'table-modal';
        const addrValue = isDev ? (row.macAddress || row.busAddress || '') : (row.deviceId || '');
        
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Objekt bearbeiten</h3>
                <div class="settings-group">
                    <label>Name</label>
                    <input type="text" id="edit-name" value="${row.name || ''}">
                </div>
                <div class="settings-group">
                    <label>Standort (Apartment)</label>
                    <select id="edit-location">
                        <option value="">-- Wird später konfiguriert --</option>
                        <option value="Wohnzimmer" ${row.location === 'Wohnzimmer' ? 'selected' : ''}>Wohnzimmer</option>
                        <option value="Küche" ${row.location === 'Küche' ? 'selected' : ''}>Küche</option>
                        <option value="Bedroom" ${row.location === 'Bedroom' ? 'selected' : ''}>Bedroom</option>
                        <option value="Living Room" ${row.location === 'Living Room' ? 'selected' : ''}>Living Room</option>
                    </select>
                </div>
                ${isDev ? `
                <div class="settings-group">
                    <label>MAC- oder Bus-Adresse</label>
                    <input type="text" id="edit-address" value="${addrValue}">
                </div>
                <div class="settings-group">
                    <label>Netzwerk (Bus)</label>
                    <select id="edit-bustype">
                        <option value="WIFI" ${row.busType === 'WIFI' ? 'selected' : ''}>WIFI</option>
                        <option value="Thread" ${row.busType === 'Thread' ? 'selected' : ''}>Thread</option>
                        <option value="RS485" ${row.busType === 'RS485' ? 'selected' : ''}>RS485</option>
                        <option value="Ethernet" ${row.busType === 'Ethernet' ? 'selected' : ''}>Ethernet</option>
                    </select>
                </div>
                ` : `
                <div class="settings-group">
                    <label>Master-Gerät (Hardware)</label>
                    <select id="edit-address">
                        <option value="">-- Bitte wählen --</option>
                        ${devices.map(d => `<option value="${d.id}" data-channels="${JSON.stringify(d.channels || []).replace(/"/g, '&quot;')}" ${d.id === row.deviceId ? 'selected' : ''}>${d.name} (${d.id.split('-')[0]}...)</option>`).join('')}
                    </select>
                </div>
                <div class="settings-group">
                    <label>IO-Port (Channel)</label>
                    <select id="edit-ioport">
                        <option value="">-- Zuerst Gerät wählen --</option>
                    </select>
                </div>
                `}
                <div id="edit-msg" class="modal-msg"></div>
                <div class="table-modal-actions">
                    <button id="edit-cancel">Abbrechen</button>
                    <button id="edit-confirm" class="btn-add">${isDev ? 'Speichern & Suchen' : 'Speichern'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#edit-cancel').onclick = () => modal.remove();
        
        if (!isDev) {
            const devSelect = modal.querySelector('#edit-address');
            const portSelect = modal.querySelector('#edit-ioport');
            
            const updatePorts = () => {
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
                        const sel = (ch === row.channel) ? 'selected' : '';
                        const isUsed = usedPorts.has(String(ch));
                        portSelect.innerHTML += `<option value="${ch}" ${sel} ${isUsed ? 'disabled' : ''}>${ch}${isUsed ? ' (Belegt)' : ''}</option>`;
                    });
                } else if (typeof channels === 'number' && channels > 0) {
                    for (let i = 1; i <= channels; i++) {
                        const sel = (String(i) === String(row.channel)) ? 'selected' : '';
                        const isUsed = usedPorts.has(String(i));
                        portSelect.innerHTML += `<option value="${i}" ${sel} ${isUsed ? 'disabled' : ''}>${i}${isUsed ? ' (Belegt)' : ''}</option>`;
                    }
                }
            };
            
            devSelect.addEventListener('change', () => {
                row.channel = null; 
                updatePorts();
            });
            updatePorts();
        }

        const msgEl = modal.querySelector('#edit-msg');
        const btnConfirm = modal.querySelector('#edit-confirm');

        btnConfirm.onclick = async () => {
            const newName = modal.querySelector('#edit-name').value.trim();
            const newLoc = modal.querySelector('#edit-location').value;
            const newAddr = modal.querySelector('#edit-address').value.trim();
            const newBusType = isDev ? modal.querySelector('#edit-bustype').value : null;
            
            if (!newName || !newAddr) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = '✖ Bitte alle Pflichtfelder ausfüllen.';
                return;
            }

            btnConfirm.disabled = true;
            row.name = newName;
            row.location = newLoc;

            if (isDev) {
                row.macAddress = newAddr.includes(':') ? newAddr : '';
                row.busAddress = !newAddr.includes(':') ? newAddr : '';
                row.busType = newBusType;
            } else {
                row.deviceId = newAddr;
                row.channel = modal.querySelector('#edit-ioport').value.trim();
                const devObj = devices.find(d => d.id === newAddr);
                if (devObj) row.deviceName = devObj.name;
            }

            try {
                if (isDev) await window.API.updateDevice(row.id, row);
                else if (this.options.isActuator) await window.API.updateActuator(row.id, row);
                else await window.API.updateSensor(row.id, row);
                
                this._render();
                modal.remove();
                
                // Erneut Suchen triggern, falls es sich um ein Device handelt
                if (isDev) {
                    this._triggerSearch(row);
                }
            } catch (err) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = `✖ Fehler beim Speichern.`;
                btnConfirm.disabled = false;
            }
        };
    }

    _render() {
        this.tbody.innerHTML = '';
        this.countEl.textContent = `${this.filtered.length} / ${this.data.length}`;
        
        this.filtered.forEach(row => {
            const tr = document.createElement('tr');
            this.columns.forEach(col => {
                const td = document.createElement('td');
                td.innerHTML = col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—');
                
                // Event Delegation für Actions
                if(col.key === 'actions') {
                    const btnDel = td.querySelector('.btn-delete');
                    const btnEdit = td.querySelector('.btn-edit');
                    if (btnDel) btnDel.onclick = () => this._onDelete(row.id);
                    if (btnEdit) btnEdit.onclick = () => this._onEdit(row);
                }
                tr.appendChild(td);
            });
            this.tbody.appendChild(tr);
        });
    }

    _onSearch() {
        const q = this.searchInput.value.toLowerCase();
        this.filtered = this.data.filter(row =>
            this.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
        );
        this._applySort();
        this._render();
    }

    _onSort(key, th) {
        if (this.sortKey === key) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortKey = key;
            this.sortAsc = true;
        }
        // update header classes
        this.table.querySelectorAll('th').forEach(t => {
            t.classList.remove('sorted');
            const icon = t.querySelector('.sort-icon');
            if (icon) icon.textContent = '⇅';
        });
        th.classList.add('sorted');
        const thIcon = th.querySelector('.sort-icon');
        if (thIcon) thIcon.textContent = this.sortAsc ? '▲' : '▼';
        this._applySort();
        this._render();
    }

    _applySort() {
        if (!this.sortKey) return;
        const key = this.sortKey, asc = this.sortAsc;
        this.filtered.sort((a, b) => {
            const av = a[key] ?? '', bv = b[key] ?? '';
            return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
    }

}
