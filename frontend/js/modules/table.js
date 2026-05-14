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
                    <div style="display: flex; gap: 4px; white-space: nowrap;">
                        <button class="btn-edit" title="Bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="Bearbeiten"></button>
                        <button class="btn-delete" title="Löschen"><img src="assets/icons/trash-svgrepo-com.svg" alt="Löschen"></button>
                    </div>
                ` 
            });
        }
        
        this.data      = [];
        this.filtered  = [];
        this.sortKey   = null;
        this.sortAsc   = true;
        this.currentPage = 1;
        this.pageSize = this.options.pageSize || 10; // Standard: 10 Einträge pro Seite
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
        
        this.paginationContainer = document.createElement('div');
        this.paginationContainer.className = 'data-table-pagination';
        wrapper.appendChild(this.paginationContainer);

        this.container.appendChild(wrapper);
    }

    _showAddModal() {
        if (typeof this.options.onAdd === 'function') {
            this.options.onAdd();
        }
    }

    async _onDelete(rowId) {
        const confirmed = await window.Dialog.confirm('Löschen bestätigen', 'Sind Sie sicher, dass das Objekt gelöscht werden soll?');
        if (confirmed) {
            if (typeof this.options.onDelete === 'function') this.options.onDelete(rowId);
        }
    }

    _onEdit(row) {
        if (typeof this.options.onEdit === 'function') {
            this.options.onEdit(row);
        }
    }

    _addRow(obj) {
        this.data.push(obj);
        this.setData(this.data);
    }

    _render() {
        this.tbody.innerHTML = '';
        this.countEl.textContent = `${this.filtered.length} / ${this.data.length}`;
        
        const totalPages = Math.ceil(this.filtered.length / this.pageSize) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageRows = this.filtered.slice(startIndex, endIndex);
        
        pageRows.forEach(row => {
            const tr = document.createElement('tr');
            
            // Neu: Zeile klickbar machen für Auswahlen (Master/Detail Logik)
            if (typeof this.options.onRowClick === 'function') {
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return; // Klicks auf Aktionen ignorieren
                    this.tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
                    tr.classList.add('selected-row');
                    this.options.onRowClick(row);
                });
            }

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
        
        this._renderPagination(totalPages);
    }

    _renderPagination(totalPages) {
        this.paginationContainer.innerHTML = '';
        if (this.filtered.length <= this.pageSize) return; // Verstecken, wenn alles auf eine Seite passt

        const btnPrev = document.createElement('button');
        btnPrev.className = 'pagination-btn';
        btnPrev.innerHTML = '&#9664;'; // Pfeil links
        btnPrev.disabled = this.currentPage === 1;
        btnPrev.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this._render();
            }
        };

        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.textContent = `Seite ${this.currentPage} von ${totalPages}`;

        const btnNext = document.createElement('button');
        btnNext.className = 'pagination-btn';
        btnNext.innerHTML = '&#9654;'; // Pfeil rechts
        btnNext.disabled = this.currentPage === totalPages;
        btnNext.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this._render();
            }
        };

        this.paginationContainer.appendChild(btnPrev);
        this.paginationContainer.appendChild(info);
        this.paginationContainer.appendChild(btnNext);
    }

    _onSearch() {
        // Suchanfrage in einzelne Wörter aufteilen (Trennzeichen: Leerzeichen)
        const queryTerms = this.searchInput.value.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        
        if (queryTerms.length === 0) {
            this.filtered = [...this.data];
        } else {
            this.filtered = this.data.filter(row =>
                // JEDES Suchwort muss in MINDESTENS EINER Spalte der Zeile vorkommen
                queryTerms.every(term => this.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(term)))
            );
        }
        this.currentPage = 1; // Bei neuer Suche immer auf Seite 1 springen
        this._applySort();
        this._render();
    }

    setSearchQuery(query) {
        if (this.searchInput) {
            this.searchInput.value = query || '';
            this._onSearch();
        }
    }

    _onSort(key, th) {
        if (this.sortKey === key) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortKey = key;
            this.sortAsc = true;
        }
        this.currentPage = 1; // Bei Sortierung auf Seite 1 springen
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
