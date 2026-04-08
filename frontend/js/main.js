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
    'Zuhause':   'zuhause',
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
                navigate(DASHBOARD_TILE_MAP[id]);
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
    zuhause:   renderZuhause,
    actuators: renderActuators,
    rules:     renderRules,
    users:     renderUsers,
    settings:  renderSettings,
}

function navigate(view) {
    sidebar.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    const li = sidebar.querySelector(`li[title="${view.charAt(0).toUpperCase() + view.slice(1)}"]`);
    if (li) li.classList.add('active');
    (SIDEBAR_VIEWS_MAP[view] || renderDashboard)();
};

sidebar.querySelectorAll('li[title]').forEach(li => {
    li.addEventListener('click', () => navigate(li.title.toLowerCase()));
});

// ── Dashboard view (existing content) ────────────────────────────────────────
const dashboardHTML = document.getElementById('content').innerHTML;

function renderDashboard() {
    content.innerHTML = dashboardHTML;
    initDashboardTiles();
    // re-init overview grid after DOM swap
    if (typeof GridManager !== 'undefined') GridManager.init();
}

// ── Devices view ──────────────────────────────────────────────────────────────
function renderDevices() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Devices (Hardware)</h1>
        </div>
        <div id="device-table-container"></div>
    `;
    
    if (typeof DeviceManager !== 'undefined') DeviceManager.init();
}

// ── Sensors view ──────────────────────────────────────────────────────────────
function renderSensors() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Sensors</h1>
        </div>
        <div id="sensor-table-container"></div>
    `;

    if (typeof SensorManager !== 'undefined') SensorManager.init();
}

// ── Zuhause view ───────────────────────────────────────────────────────────
function renderZuhause() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Zuhause</h1>
        </div>
        <div class="zuhause-content" id="zuhause-container">
            <!-- OPEN: visual room cards will be injected here -->
            <p class="page-placeholder">Lade Haus-Struktur...</p>
        </div>
    `;
}

// ── Actuators view ──────────────────────────────────────────────────────────
function renderActuators() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Actuators</h1>
        </div>
        <div id="actuator-table-container"></div>
    `;

    if (typeof ActuatorManager !== 'undefined') ActuatorManager.init();
}

// ── Rules view ──────────────────────────────────────────────────────────────
function renderRules() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Rules</h1>
        </div>
        <div id="rules-table-container"></div>
    `;

    if (typeof RuleManager !== 'undefined') RuleManager.init();
}

// ── Users view ──────────────────────────────────────────────────────────────
function renderUsers() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Users</h1>
        </div>
        <div class="users-content">
            <!-- OPEN: user list / management injected here -->
            <!-- window.API.getUsers().then(data => ...) -->
            <p class="page-placeholder">Users view – coming soon</p>
        </div>
    `;
}

// ── Settings view ───────────────────────────────────────────────────────────
function renderSettings() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Settings</h1>
        </div>
        <div class="settings-content">
            <!-- OPEN: settings sections injected here -->
            <p class="page-placeholder">Settings view – coming soon</p>
        </div>
    `;
}