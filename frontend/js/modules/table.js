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

    _showAddModal() {
        const isDev = this.options.isDevice;
        const modal = document.createElement('div');
        modal.className = 'table-modal';
        modal.innerHTML = `
            <div class="table-modal-box">
                <h3>Neues Objekt erfassen</h3>
                <p>${isDev ? 'Suchen Sie das neue Hardware-Gerät im Netzwerk:' : 'Geben Sie die Adresse und den IO-Port des Datenpunkts ein:'}</p>
                <div class="settings-group">
                    <label>MAC- oder Bus-Adresse</label>
                    <input type="text" id="modal-address" placeholder="z.B. AA:BB:CC... oder 0x05">
                </div>
                ${!isDev ? `
                <div class="settings-group">
                    <label>IO-Port (Channel)</label>
                    <input type="text" id="modal-ioport" placeholder="z.B. AI_1 oder DO_1">
                </div>
                ` : ''}
                <div id="modal-msg" class="modal-msg"></div>
                <div class="table-modal-actions">
                    <button id="modal-cancel">Abbrechen</button>
                    <button id="modal-search" class="btn-primary">Suchen</button>
                    <button id="modal-confirm" class="btn-add" style="display: none;">Hinzufügen</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#modal-cancel').onclick = () => modal.remove();
        
        const msgEl = modal.querySelector('#modal-msg');
        const btnSearch = modal.querySelector('#modal-search');
        const btnConfirm = modal.querySelector('#modal-confirm');
        let foundDevice = null;

        btnSearch.onclick = async () => {
            const addr = modal.querySelector('#modal-address').value.trim();
            const port = !isDev ? modal.querySelector('#modal-ioport').value.trim() : '';
            
            if (!addr) return;
            
            btnSearch.disabled = true;
            msgEl.className = 'modal-msg';
            msgEl.innerHTML = 'Suchen...';

            try {
                // Echte API-Suche im Netzwerk/Bussystem starten
                const scannedDevice = await window.API.scanDevice(addr);
                
                if (scannedDevice) {
                    if (!isDev) {
                        // Prüfen, ob der Datenpunkt/Port am Gerät existiert
                        const channels = scannedDevice.channels || [];
                        if (!channels.includes(port)) {
                            msgEl.className = 'modal-msg error';
                            msgEl.innerHTML = `✖ Fehler: Gerät gefunden, aber IO-Port <strong>${port}</strong> existiert nicht.`;
                            btnSearch.disabled = false;
                            foundDevice = null;
                            return;
                        }
                        scannedDevice.channel = port;
                    }
                    
                    foundDevice = scannedDevice;
                    msgEl.className = 'modal-msg success';
                    msgEl.innerHTML = `✔ Gerät gefunden: <strong>${foundDevice.name}</strong>`;
                    btnSearch.style.display = 'none';
                    btnConfirm.style.display = 'flex';
                } else {
                    msgEl.className = 'modal-msg error';
                    msgEl.innerHTML = `✖ Fehler: Kein Gerät mit dieser Adresse gefunden.<br><small>(Tipp: Teste "0x05" oder "AA:BB:CC:DD:EE:FF")</small>`;
                    btnSearch.disabled = false;
                    foundDevice = null;
                }
            } catch (err) {
                msgEl.className = 'modal-msg error';
                msgEl.innerHTML = `✖ Netzwerkfehler bei der Suche.`;
                btnSearch.disabled = false;
                foundDevice = null;
            }
        };

        modal.querySelector('#modal-confirm').onclick = async () => {
            if (foundDevice) {
                const newId = typeof generateUUID === 'function' ? generateUUID() : '00000000-0000-0000-0000-000000000000';
                const newEntry = {
                    id: newId,
                    ...foundDevice,
                    value: '-',
                    unit: '',
                    battery: null,
                    signal: null,
                    updated: 'jetzt'
                };

                if (isDev) {
                    delete newEntry.channel;
                    delete newEntry.value;
                    delete newEntry.unit;
                    delete newEntry.type;
                }
                
                try {
                    // An die API übermitteln
                    if (isDev) {
                        await window.API.addDevice(newEntry);
                    } else if (this.options.isActuator) {
                        await window.API.addActuator(newEntry);
                    } else {
                        await window.API.addSensor(newEntry);
                    }
                    this._addRow(newEntry);
                    modal.remove();
                } catch (err) {
                    msgEl.className = 'modal-msg error';
                    msgEl.innerHTML = `✖ Fehler beim Speichern im System.`;
                }
            }
        };
    }

    _addRow(obj) {
        this.data.push({ ...obj, status: 'active' });
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

    async _onRename(row) {
        const newName = prompt('Neuer Name für das Objekt:', row.name);
        if (newName && newName !== row.name) {
            try {
                if (this.options.isDevice) await window.API.updateDevice(row.id, { name: newName });
                else if (this.options.isActuator) await window.API.updateActuator(row.id, { name: newName });
                else await window.API.updateSensor(row.id, { name: newName });
                
                row.name = newName;
                this._render();
            } catch (err) {
                console.error("Fehler beim Umbenennen:", err);
                alert("Umbenennen fehlgeschlagen.");
            }
        }
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
                    if (btnEdit) btnEdit.onclick = () => this._onRename(row);
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
