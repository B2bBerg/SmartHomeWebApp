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
                <div class="table-modal-box dialog-alert-box">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="table-modal-actions">
                        <button class="btn-danger dialog-btn-yes">Ja</button>
                        <button class="btn-outline dialog-btn-no">Nein</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('.dialog-btn-no').onclick = () => { modal.remove(); resolve(false); };
            modal.querySelector('.dialog-btn-yes').onclick = () => { modal.remove(); resolve(true); };
        });
    },

    async alert(title, message, isError = false) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100000'; // Behebt das Überlappungs-Problem mit anderen Modals
            const headerClass = isError ? 'header-error' : 'header-info';
            const btnClass = isError ? 'btn-danger' : 'btn-primary';
            modal.innerHTML = `
                <div class="table-modal-box dialog-alert-box">
                    <h3 class="${headerClass}">${title}</h3>
                    <p>${message}</p>
                    <div class="table-modal-actions">
                        <button class="${btnClass} dialog-btn-ok">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
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
            
            let listHtml = `<div class="dialog-select-list">`;
            
            if (!items || items.length === 0) {
                listHtml += `<div class="dialog-select-empty">Keine Einträge gefunden.</div>`;
            } else {
                items.forEach((item, index) => {
                    // renderItem() wird vom Aufrufer definiert (z.B. locations.js) und baut das HTML pro Zeile
                    listHtml += `<div class="dialog-select-item" data-index="${index}">
                        ${renderItem(item)}
                    </div>`;
                });
            }
            listHtml += `</div>`;

            modal.innerHTML = `
                <div class="table-modal-box dialog-alert-box dialog-select-box">
                    <h3>${title}</h3>
                    ${listHtml}
                    <div class="table-modal-actions">
                        <button class="btn-outline dialog-btn-cancel">Abbrechen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Hover-Effekte und Klick-Events für die Listen-Elemente
            const listElements = modal.querySelectorAll('.dialog-select-item');
            listElements.forEach(el => {
                el.addEventListener('click', () => {
                    const selectedItem = items[el.dataset.index];
                    modal.remove();
                    resolve(selectedItem);
                });
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
            const tables = config.tables || (config.tableColumns ? [{
                id: 'default',
                title: 'Oder aus Vorlage / Bestand wählen:',
                columns: config.tableColumns,
                data: config.tableData,
                onRowSelect: config.onRowSelect
            }] : []);

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
                const colSpanClass = f.fullWidth ? 'full-width' : '';
                
                let inputHtml = '';
                if (f.type === 'select') {
                    const optionsHtml = (f.options || []).map(opt => `<option value="${opt.value}" ${f.value === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
                    inputHtml = `<select id="df_${f.id}">${optionsHtml}</select>`;
                } else {
                    inputHtml = `<input type="${f.type || 'text'}" id="df_${f.id}" placeholder="${f.placeholder || ''}" ${f.readonly ? 'readonly' : ''} value="${f.value || ''}">`;
                }

                fieldsHtml += `
                    <div class="settings-group ${colSpanClass}">
                        <label>${f.label}</label>
                        ${inputHtml}
                    </div>
                `;
            });

            let tableSectionHtml = '';
            if (tables.length > 0) {
                let tabsHtml = '';
                if (tables.length > 1) {
                    tabsHtml = `<div class="dialog-tabs">` +
                        tables.map((t, i) => `<button type="button" class="dialog-tab-btn ${i===0 ? 'active' : ''}" data-target="${t.id}">${t.title}</button>`).join('') +
                        `</div>`;
                } else if (tables.length === 1 && tables[0].title) {
                    tabsHtml = `<div class="dialog-tabs"><label>${tables[0].title}</label></div>`;
                }
                tableSectionHtml = `
                    <div class="dialog-table-section">
                        ${tabsHtml}
                        <div id="dialog-table-container" class="dialog-table-container"></div>
                    </div>
                `;
            }

            const boxClass = tables.length > 0 ? 'dialog-form-box with-tables' : 'dialog-form-box';
            modal.innerHTML = `
                <div class="table-modal-box ${boxClass}">
                    <h3>${title}</h3>
                    
                    <div class="dialog-form-grid">
                        ${fieldsHtml}
                    </div>

                    ${tableSectionHtml}

                    <div class="table-modal-actions">
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
            let activeTabId = tables.length > 0 ? tables[0].id : null;

            // Logik zum Wechseln der sichtbaren Tabelle
            const renderTabTable = (tabId) => {
                if (!tableContainer) return;
                const tabConfig = tables.find(t => t.id === tabId);
                if (!tabConfig) return;
                activeTabId = tabId;
                
                tableContainer.innerHTML = '';
                if (typeof DataTable !== 'undefined') {
                    currentTableInstance = new DataTable(tableContainer, tabConfig.columns, {
                        hasAdd: false, hasActions: false, 
                        searchable: config.searchable !== false, // Übernimmt Option aus der Config
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
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
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

            if (activeTabId) renderTabTable(activeTabId);
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
            modal.querySelector('.dialog-btn-cancel').onclick = () => { modal.remove(); resolve(null); };
            modal.querySelector('.dialog-btn-save').onclick = async () => {
                const result = {};
                fields.forEach(f => result[f.id] = formElements[f.id].value);
                
                if (typeof config.validate === 'function') {
                    const isValid = await config.validate(result);
                    if (!isValid) return; // Validation failed, do not close modal
                }
                
                modal.remove();
                resolve(result);
            };
        });
    }
};

window.Dialog = Dialog;