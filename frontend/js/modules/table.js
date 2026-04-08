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
        if (typeof this.options.onAdd === 'function') {
            this.options.onAdd();
        }
    }

    async _onDelete(rowId) {
        if(confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
            if (typeof this.options.onDelete === 'function') {
                this.options.onDelete(rowId);
            }
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
