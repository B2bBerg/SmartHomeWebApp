/**
 * dashboard.js – Verwaltung der Dashboards (app_page) und deren Kacheln (tiles)
 */

const DashboardManager = {
    init() {
        // 1. Initialisiere das Kachel-System für das aktuell angezeigte Dashboard
        if (typeof TileManager !== 'undefined') {
            window.GridManager = TileManager; // Alias zur Sicherheit
            TileManager.init();
        }

        // 2. Initialisiere die Verwaltungs-Tabelle für ganze Dashboards (app_page)
        const container = document.getElementById('dashboard-table-container');
        if (!container) return;

        const columns = [
            { key: 'name', label: 'Dashboard Name', render: (val, row) => `<strong>${val || 'Unbenannt'}</strong><br><small style="color:var(--text-muted)">Slug: ${row.slug}</small>` },
            { key: 'type', label: 'Typ', render: (val, row) => row.slug && row.slug.startsWith('dashboard_room_') ? '<span class="badge badge--active" style="background:var(--accent-blue); color:white;">Raum</span>' : '<span class="badge badge--primary" style="background:var(--primary-color); color:white;">Allgemein</span>' },
            { key: 'locationId', label: 'Standort', render: (val) => val ? `<span style="font-family:monospace; font-size:0.85em;">${val}</span>` : '—' },
            { key: 'userId', label: 'Benutzer', render: (val) => val ? `<span style="font-family:monospace; font-size:0.85em;">${val}</span>` : '—' },
            { key: 'sortOrder', label: 'Sortierung' },
            { key: 'actions', label: 'Aktion', render: (val, row) => `<button class="btn-outline btn-small" onclick="window.DashboardManager.openDashboard('${row.slug}', '${row.name}')">Öffnen / Kacheln bearbeiten</button>` }
        ];

        this.table = new DataTable(container, columns, {
            searchable: true,
            onAdd: () => this.showAddModal(),
            onDelete: (rowId) => this.deleteDashboard(rowId)
        });

        this.loadData();
    },

    async loadData() {
        try {
            const dashboards = await window.API.getAllDashboards();
            this.table.setData(dashboards);
        } catch (err) {
            console.error("Fehler beim Laden der Dashboards:", err);
            const container = document.getElementById('dashboard-table-container');
            if (container) container.innerHTML = '<p class="page-placeholder error">Fehler beim Laden der Dashboards.</p>';
        }
    },

    async showAddModal() {
        const result = await window.Dialog.formWithTable({
            title: 'Neues Dashboard (app_page) erstellen',
            saveText: 'Erstellen',
            fields: [
                { id: 'name', label: 'Name *', placeholder: 'z.B. Wohnzimmer Dashboard', fullWidth: true },
                { id: 'slug', label: 'Eindeutiger Bezeichner (Slug) *', placeholder: 'z.B. wohnzimmer', fullWidth: true },
                { id: 'sortOrder', label: 'Sortierung', type: 'number', value: 0, fullWidth: false }
            ],
            validate: (res) => {
                if (!res.name || !res.slug) {
                    window.Dialog.alert('Fehler', 'Bitte Name und Slug ausfüllen.', true);
                    return false;
                }
                return true;
            }
        });

        if (result) {
            try {
                await window.API.saveDashboard(result.slug, {
                    name: result.name,
                    slug: result.slug,
                    sortOrder: parseInt(result.sortOrder) || 0,
                    tiles: [] // Kacheln (tiles) werden über den Kachel-Manager separat hinzugefügt
                });
                this.loadData();
            } catch (err) {
                window.Dialog.alert('Fehler beim Speichern', err.message, true);
            }
        }
    },

    async deleteDashboard(rowId) {
        if (await window.Dialog.confirm('Dashboard löschen', 'Soll das gesamte Dashboard (app_page) mitsamt allen darauf platzierten Kacheln (tiles) wirklich gelöscht werden?')) {
            try {
                await window.API.deleteDashboard(rowId);
                this.table.data = this.table.data.filter(r => r.id !== rowId);
                this.table.setData(this.table.data);
            } catch (err) {
                console.error("Fehler beim Löschen:", err);
                window.Dialog.alert("Fehler", "Dashboard konnte nicht gelöscht werden.", true);
            }
        }
    },

    openDashboard(slug, name) {
        const content = document.getElementById('content');
        
        // DOM mit dem spezifischen Kachel-Canvas für dieses Dashboard überschreiben
        content.innerHTML = `
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                <h2>Dashboard: ${name}</h2>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-outline" onclick="window.renderView('dashboard')">Zurück zur Übersicht</button>
                    <button id="custom-edit-mode-btn" class="btn-outline" title="Kachel-Layout bearbeiten"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Layout bearbeiten</button>
                    <button id="custom-add-tile-btn" class="btn-add" title="Kachel hinzufügen"><span><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add"></span> Kachel hinzufügen</button>
                </div>
            </div>
            <div id="custom-dashboard-grid" class="overview-container" style="background:transparent; border:none; padding:0; min-height:400px;"></div>
        `;
        
        if (typeof window.TileManager !== 'undefined') {
            const instance = window.TileManager.createInstance({
                container: '#custom-dashboard-grid',
                storageKey: slug, // Der TileManager kommuniziert über diesen Slug mit der get/save API
                editBtn: '#custom-edit-mode-btn',
                addBtn: '#custom-add-tile-btn'
            });
            instance.init();
        }
    }
};

window.DashboardManager = DashboardManager;

document.addEventListener('DOMContentLoaded', () => {
    // DashboardManager.init() wird vorerst nicht aufgerufen, da die Übersicht später in die Einstellungen wandert.
    if (typeof TileManager !== 'undefined') {
        window.GridManager = TileManager; // Alias zur Sicherheit
        TileManager.init();
    }
});
