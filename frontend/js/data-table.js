/**
 * data-table.js – Reusable DOM-based data table component
 *
 * Usage:
 *   const table = new DataTable(containerEl, columns, options);
 *   table.setData(rows);
 *
 * columns: [{ key, label, render? }]
 * options: { searchable?, title? }
 */
class DataTable {
    constructor(container, columns, options = {}) {
        this.container = container;
        this.columns   = columns;
        this.options   = options;
        this.data      = [];
        this.filtered  = [];
        this.sortKey   = null;
        this.sortAsc   = true;
        this._build();
    }

    // ── API: call setData() with rows from DB ────────────────────────────────
    // e.g. window.API.getSensors().then(data => table.setData(data));
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

        if (this.options.searchable !== false) {
            this.searchInput = document.createElement('input');
            this.searchInput.className   = 'data-table-search';
            this.searchInput.placeholder = 'Search…';
            this.searchInput.addEventListener('input', () => this._onSearch());
            toolbar.appendChild(this.searchInput);
        }

        this.countEl = document.createElement('span');
        this.countEl.className = 'data-table-count';
        toolbar.appendChild(this.countEl);

        this.container.appendChild(toolbar);

        // Table
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
            th.innerHTML = `${col.label} <span class="sort-icon">⇅</span>`;
            th.addEventListener('click', () => this._onSort(col.key, th));
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        this.table.appendChild(thead);

        // Body
        this.tbody = document.createElement('tbody');
        this.table.appendChild(this.tbody);

        wrapper.appendChild(this.table);
        this.container.appendChild(wrapper);
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
            t.querySelector('.sort-icon').textContent = '⇅';
        });
        th.classList.add('sorted');
        th.querySelector('.sort-icon').textContent = this.sortAsc ? '▲' : '▼';
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

    _render() {
        this.tbody.innerHTML = '';
        this.countEl.textContent = `${this.filtered.length} / ${this.data.length}`;
        this.filtered.forEach(row => {
            const tr = document.createElement('tr');
            this.columns.forEach(col => {
                const td = document.createElement('td');
                td.innerHTML = col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—');
                tr.appendChild(td);
            });
            this.tbody.appendChild(tr);
        });
    }
}
