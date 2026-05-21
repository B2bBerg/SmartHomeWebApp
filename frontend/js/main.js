// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const toggle = document.getElementById('sidebar-toggle');

const collapsedWidth = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--sidebar-collapsed-width')
);

let expandedWidth = null;

function setSidebarWidth(width) {
    sidebar.style.width = width + 'px';
    document.documentElement.style.setProperty('--sidebar-width', width + 'px');
}

function measureExpandedWidth() {
    sidebar.style.width = 'max-content';
    expandedWidth = sidebar.getBoundingClientRect().width;
    setSidebarWidth(expandedWidth);
}

const toggleImg = toggle.querySelector('img');
const ICON_EXPANDED = 'assets/icons/arrow-narrow-left-alignment-svgrepo-com.svg';
const ICON_COLLAPSED = 'assets/icons/arrow-narrow-right-move-svgrepo-com.svg';

toggle.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    setSidebarWidth(isCollapsed ? collapsedWidth : expandedWidth);
    toggleImg.src = isCollapsed ? ICON_COLLAPSED : ICON_EXPANDED;
});

measureExpandedWidth();

// Sidebar collapsed by default
sidebar.classList.add('collapsed');
setSidebarWidth(collapsedWidth);
toggleImg.src = ICON_COLLAPSED;

// Dashboard tiles navigation ────────────────────────────────────────────────────────────
const DASHBOARD_TILE_MAP = {
    'Sensors':   'sensors',
    'Devices':   'devices',
    'Locations': 'locations',
    'Actuators': 'actuators',
    'Rules':     'rules',
    'Users':     'users',
    'Settings':  'settings'
};

function initDashboardTiles() {
    Object.keys(DASHBOARD_TILE_MAP).forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                if (window.Router) {
                    window.Router.navigate(`#${DASHBOARD_TILE_MAP[id]}`);
                }
            });
        }
    });
}

initDashboardTiles();

// ── SPA Navigation ────────────────────────────────────────────────────────────
const content = document.getElementById('content');

// Views registry – add new views here
const SIDEBAR_VIEWS_MAP = {
    dashboard: renderDashboard,
    devices:   renderDevices,
    sensors:   renderSensors,
    locations: renderLocations,
    actuators: renderActuators,
    rules:     renderRules,
    users:     renderUsers,
    settings:  renderSettings,
}

const VIEW_TITLE_MAP = {
    dashboard: 'Dashboard',
    locations: 'Standorte',
    devices:   'Geräte',
    sensors:   'Sensoren',
    actuators: 'Aktoren',
    rules:     'Regeln',
    users:     'Benutzer',
    settings:  'Einstellungen'
};

window.updateActiveNav = function(view) {
    sidebar.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    const title = VIEW_TITLE_MAP[view] || 'Dashboard';
    const li = sidebar.querySelector(`li[title="${title}"]`);
    if (li) li.classList.add('active');
};

window.renderView = function(view) {
    window.updateActiveNav(view);
    const renderFunc = SIDEBAR_VIEWS_MAP[view] || renderDashboard;
    renderFunc();
};

sidebar.querySelectorAll('li[title]').forEach(li => {
    li.addEventListener('click', () => {
        const viewKey = Object.keys(VIEW_TITLE_MAP).find(k => VIEW_TITLE_MAP[k] === li.title) || 'dashboard';
        if (window.Router) {
            window.Router.navigate(`#${viewKey}`);
        }
    });
});

// ── Dashboard view (existing content) ────────────────────────────────────────
const dashboardHTML = document.getElementById('content').innerHTML;

function renderDashboard() {
    content.innerHTML = dashboardHTML;
    initDashboardTiles();
    if (typeof TileManager !== 'undefined') {
        TileManager.init();
    }
}

// ── Devices view ──────────────────────────────────────────────────────────────
function renderDevices() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Geräte (Hardware)</h1>
        </div>
        <div id="device-table-container"></div>
    `;
    
    if (typeof DeviceManager !== 'undefined') DeviceManager.init();
}

// ── Sensors view ──────────────────────────────────────────────────────────────
function renderSensors() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Sensoren</h1>
        </div>
        <div id="sensor-table-container"></div>
    `;

    if (typeof SensorManager !== 'undefined') SensorManager.init();
}

// ── Locations view ─────────────────────────────────────────────────────────
function renderLocations() {
    content.innerHTML = `
        <div class="locations-content" id="locations-container">
            <p class="page-placeholder">Lade Locations-Struktur...</p>
        </div>
    `;
    if (typeof LocationsManager !== 'undefined') LocationsManager.init();
}

// ── Actuators view ──────────────────────────────────────────────────────────
function renderActuators() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Aktoren</h1>
        </div>
        <div id="actuator-table-container"></div>
    `;

    if (typeof ActuatorManager !== 'undefined') ActuatorManager.init();
}

// ── Rules view ──────────────────────────────────────────────────────────────
function renderRules() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Regeln</h1>
        </div>
        <div id="rules-table-container"></div>
    `;

    if (typeof RuleManager !== 'undefined') RuleManager.init();
}

// ── Users view ──────────────────────────────────────────────────────────────
function renderUsers() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Benutzer</h1>
        </div>
        <div class="users-content">
            <div id="user-table-container"></div>
        </div>
    `;

    const userContainer = document.getElementById('user-table-container');
    if (!userContainer) return;

    const columns = [
        { key: 'username', label: 'Benutzername', render: (val, row) => `<strong>${val || 'N/A'}</strong><br><small title="${row.id}" style="font-family: monospace; color: var(--text-muted);">${row.id}</small>` },
        { key: 'lastLogin', label: 'Zuletzt aktiv', render: (val) => val ? new Date(val).toLocaleString('de-CH') : 'Nie' },
        { key: 'permissions', label: 'Berechtigungen', render: (val) => val ? `${val.length} Regeln` : 'Keine' }
    ];

    const userTable = new DataTable(userContainer, columns, {
        searchable: true
        // Management (Add/Edit/Delete) kann in einem nächsten Schritt implementiert werden.
    });

    window.API.getUsers()
        .then(users => {
            if (users && users.length > 0) {
                userTable.setData(users);
            } else {
                userContainer.innerHTML = '<p class="page-placeholder">Keine Benutzer gefunden.</p>';
            }
        })
        .catch(err => {
            console.error("Fehler beim Laden der Benutzer:", err);
            userContainer.innerHTML = '<p class="page-placeholder error">Fehler beim Laden der Benutzer.</p>';
        });
}

// --- Init Router ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.Router) {
        window.Router.init();
    }
});

// ── Settings view ───────────────────────────────────────────────────────────
function renderSettings() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Einstellungen</h1>
        </div>
        <div class="settings-content">
            <!-- OPEN: settings sections injected here -->
            <p class="page-placeholder">Einstellungen – bald verfügbar</p>
        </div>
    `;
}