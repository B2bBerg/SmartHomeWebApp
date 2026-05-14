/**
 * dialog.js – Globale Dialog-Komponenten (Modals, Confirms)
 */
const Dialog = {
    async confirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100000'; // Behebt das Überlappungs-Problem mit anderen Modals
            modal.innerHTML = `
                <div class="table-modal-box" style="max-width: 400px; text-align: center;">
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">${title}</h3>
                    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">${message}</p>
                    <div class="table-modal-actions" style="justify-content: center;">
                        <button class="btn-primary dialog-btn-yes" style="background: var(--error-red) !important; color: white !important; border: none;">Ja</button>
                        <button class="btn-outline dialog-btn-no">Nein</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Klick ausserhalb des Fensters schliesst das Modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });

            modal.querySelector('.dialog-btn-no').onclick = () => { modal.remove(); resolve(false); };
            modal.querySelector('.dialog-btn-yes').onclick = () => { modal.remove(); resolve(true); };
        });
    },

    async alert(title, message, isError = false) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100000'; // Behebt das Überlappungs-Problem mit anderen Modals
            const headerColor = isError ? 'var(--error-red)' : 'var(--accent-blue)';
            modal.innerHTML = `
                <div class="table-modal-box" style="max-width: 400px; text-align: center;">
                    <h3 style="margin-bottom: 0.5rem; color: ${headerColor};">${title}</h3>
                    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">${message}</p>
                    <div class="table-modal-actions" style="justify-content: center;">
                        <button class="btn-primary dialog-btn-ok" style="background: ${headerColor} !important; color: white !important; border: none;">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Klick ausserhalb des Fensters schliesst das Modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve();
                }
            });

            modal.querySelector('.dialog-btn-ok').onclick = () => { modal.remove(); resolve(); };
        });
    },

    /**
     * Öffnet einen Modal-Dialog mit einer auswählbaren Liste/Tabelle.
     * @param {string} title Der Titel des Modals
     * @param {Array} items Das Array der auswählbaren Objekte
     * @param {Function} renderItem Eine Callback-Funktion, die bestimmt, wie ein einzelnes Item als HTML dargestellt wird
     * @returns {Promise<Object|null>} Das ausgewählte Item oder null bei Abbruch
     */
    async selectList(title, items, renderItem) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100001'; // Höher als normale Modals (falls doch mal Stacked Modals nötig sind)
            
            let listHtml = `<div class="select-list-container" style="max-height: 300px; overflow-y: auto; text-align: left; margin-bottom: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-base);">`;
            
            if (!items || items.length === 0) {
                listHtml += `<div style="padding: 1rem; color: var(--text-muted); text-align: center;">Keine Einträge gefunden.</div>`;
            } else {
                items.forEach((item, index) => {
                    // renderItem() wird vom Aufrufer definiert (z.B. locations.js) und baut das HTML pro Zeile
                    listHtml += `<div class="select-list-item" data-index="${index}" style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;">
                        ${renderItem(item)}
                    </div>`;
                });
            }
            listHtml += `</div>`;

            modal.innerHTML = `
                <div class="table-modal-box" style="max-width: 500px; text-align: center;">
                    <h3 style="margin-bottom: 1rem; color: var(--text-primary);">${title}</h3>
                    ${listHtml}
                    <div class="table-modal-actions" style="justify-content: center;">
                        <button class="btn-outline dialog-btn-cancel">Abbrechen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Hover-Effekte und Klick-Events für die Listen-Elemente
            const listElements = modal.querySelectorAll('.select-list-item');
            listElements.forEach(el => {
                el.addEventListener('mouseenter', () => el.style.background = 'var(--palette-surface0)');
                el.addEventListener('mouseleave', () => el.style.background = 'transparent');
                el.addEventListener('click', () => {
                    const selectedItem = items[el.dataset.index];
                    modal.remove();
                    resolve(selectedItem);
                });
            });
            
            // Klick ausserhalb oder auf Abbrechen schliesst das Modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });
            modal.querySelector('.dialog-btn-cancel').onclick = () => { modal.remove(); resolve(null); };
        });
    }
    ,

    /**
     * Ein hoch-generischer Dialog (Eingabefelder oben, Datentabelle unten).
     * Dient zum manuellen Erfassen oder Auswählen aus einem bestehenden Bestand.
     * @param {Object} config Konfiguration: title, fields, tableColumns, tableData, onRowSelect, onReady
     */
    async formWithTable(config) {
        return new Promise((resolve) => {
            const { title, fields, onReady, saveText = 'Speichern' } = config;
            
            // Rückwärtskompatibilität für Dialoge, die nur eine Tabelle nutzen
            const tables = config.tables || [{
                id: 'default',
                title: 'Oder aus Vorlage / Bestand wählen:',
                columns: config.tableColumns,
                data: config.tableData,
                onRowSelect: config.onRowSelect
            }];

            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100000';

            // 1. Felder (Oben) dynamisch aufbauen
            let fieldsHtml = '';
            fields.forEach(f => {
                if (f.type === 'hidden') {
                    fieldsHtml += `<input type="hidden" id="df_${f.id}" value="${f.value || ''}">`;
                    return;
                }
                const colSpan = f.fullWidth ? 'grid-column: 1 / -1;' : '';
                fieldsHtml += `
                    <div class="settings-group" style="${colSpan} margin-bottom: 0;">
                        <label>${f.label}</label>
                        <input type="${f.type || 'text'}" id="df_${f.id}" placeholder="${f.placeholder || ''}" ${f.readonly ? 'readonly' : ''} value="${f.value || ''}" style="width: 100%;">
                    </div>
                `;
            });

            // Tabs rendern, falls mehr als eine Tabelle konfiguriert wurde
            let tabsHtml = '';
            if (tables.length > 1) {
                tabsHtml = `<div class="dialog-tabs" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; border-bottom:1px solid var(--border-color);">` +
                    tables.map((t, i) => `<button type="button" class="dialog-tab-btn" data-target="${t.id}" style="background:none; border:none; border-bottom:2px solid ${i===0?'var(--accent-blue)':'transparent'}; color:${i===0?'var(--text-primary)':'var(--text-secondary)'}; font-weight:600; cursor:pointer; padding:0.5rem 1rem; transition:all 0.2s;">${t.title}</button>`).join('') +
                    `</div>`;
            } else if (tables.length === 1 && tables[0].title) {
                tabsHtml = `<label style="display:block; margin-bottom:0.5rem; color:var(--text-primary); font-weight:600;">${tables[0].title}</label>`;
            }

            modal.innerHTML = `
                <div class="table-modal-box" style="max-width: 900px; width: 90%; max-height: 90vh; display: flex; flex-direction: column;">
                    <h3 style="margin-bottom: 1rem; color: var(--text-primary); flex-shrink: 0;">${title}</h3>
                    
                    <div class="dialog-form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; flex-shrink: 0; margin-bottom: 1rem;">
                        ${fieldsHtml}
                    </div>

                    <div style="flex-grow: 1; display: flex; flex-direction: column; min-height: 0; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        ${tabsHtml}
                        <div id="dialog-table-container" style="overflow-y: auto; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem;"></div>
                    </div>

                    <div class="table-modal-actions" style="margin-top: 1.5rem; flex-shrink: 0;">
                        <button class="btn-primary dialog-btn-save">${saveText}</button>
                        <button class="btn-outline dialog-btn-cancel">Abbrechen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // 2. Map erstellen, um von ausserhalb leicht auf Inputs zuzugreifen
            const formElements = {};
            fields.forEach(f => formElements[f.id] = modal.querySelector(`#df_${f.id}`));

            const tableContainer = modal.querySelector('#dialog-table-container');
            let currentTableInstance = null;
            let activeTabId = tables[0].id;

            // Logik zum Wechseln der sichtbaren Tabelle
            const renderTabTable = (tabId) => {
                const tabConfig = tables.find(t => t.id === tabId);
                if (!tabConfig) return;
                activeTabId = tabId;
                
                tableContainer.innerHTML = '';
                if (typeof DataTable !== 'undefined') {
                    currentTableInstance = new DataTable(tableContainer, tabConfig.columns, {
                        hasAdd: false, hasActions: false, searchable: true,
                        pageSize: 5, // Im Modal nur 5 Einträge pro Seite anzeigen
                        onRowClick: (row) => { if (typeof tabConfig.onRowSelect === 'function') tabConfig.onRowSelect(row, formElements); }
                    });
                    currentTableInstance.setData(tabConfig.data || []);
                }
            };

            const switchToTab = (tabId) => {
                const tabBtns = modal.querySelectorAll('.dialog-tab-btn');
                tabBtns.forEach(b => {
                    if (b.dataset.target === tabId) {
                        b.style.borderBottomColor = 'var(--accent-blue)';
                        b.style.color = 'var(--text-primary)';
                    } else {
                        b.style.borderBottomColor = 'transparent';
                        b.style.color = 'var(--text-secondary)';
                    }
                });
                renderTabTable(tabId);
            };

            const updateTableData = (tabId, newData) => {
                const tab = tables.find(t => t.id === tabId);
                if (tab) {
                    tab.data = newData;
                    if (activeTabId === tabId && currentTableInstance) {
                        currentTableInstance.setData(newData);
                    }
                }
            };

            renderTabTable(activeTabId);
            modal.querySelectorAll('.dialog-tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => { e.preventDefault(); switchToTab(btn.dataset.target); });
            });

            const filterTable = (query) => {
                if (currentTableInstance) {
                    currentTableInstance.setSearchQuery(query);
                }
            };

            // 4. Custom Events (Jetzt inkl. Helper für Tab-Wechsel und Omni-Search)
            if (typeof onReady === 'function') onReady(modal, formElements, updateTableData, switchToTab, filterTable);

            // 5. Speicher-Logik
            
            // Klick ausserhalb des Fensters schliesst das Modal (Abbruch)
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });

            modal.querySelector('.dialog-btn-cancel').onclick = () => { modal.remove(); resolve(null); };
            modal.querySelector('.dialog-btn-save').onclick = () => {
                const result = {};
                fields.forEach(f => result[f.id] = formElements[f.id].value);
                modal.remove();
                resolve(result);
            };
        });
    }
};

window.Dialog = Dialog;