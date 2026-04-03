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

// ── SPA Navigation ────────────────────────────────────────────────────────────
const content = document.getElementById('content');

// Views registry – add new views here
const VIEWS = {
    dashboard: renderDashboard,
    sensors:   renderSensors,
    apartment: renderApartment,
    actuators: renderActuators,
    rules:     renderRules,
    users:     renderUsers,
    settings:  renderSettings,
};

function navigate(view) {
    sidebar.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    const li = sidebar.querySelector(`li[title="${view.charAt(0).toUpperCase() + view.slice(1)}"]`);
    if (li) li.classList.add('active');
    (VIEWS[view] || renderDashboard)();
}

sidebar.querySelectorAll('li[title]').forEach(li => {
    li.addEventListener('click', () => navigate(li.title.toLowerCase()));
});

// ── Dashboard view (existing content) ────────────────────────────────────────
const dashboardHTML = content.innerHTML;

function renderDashboard() {
    content.innerHTML = dashboardHTML;
    // re-init overview grid after DOM swap
    if (typeof GridManager !== 'undefined') GridManager.init();
}

// ── Sensors view ──────────────────────────────────────────────────────────────
function renderSensors() {
    content.innerHTML = `
        <h1>Sensors</h1>
        <div id="sensor-table-container"></div>
    `;

    const columns = [
        { key: 'name',     label: 'Name' },
        { key: 'type',     label: 'Type' },
        { key: 'location', label: 'Location' },
        { key: 'value',    label: 'Value' },
        { key: 'unit',     label: 'Unit' },
        { key: 'status',   label: 'Status', render: (val) =>
            `<span class="badge badge--${val === 'active' ? 'active' : val === 'warning' ? 'warning' : 'inactive'}">${val}</span>`
        },
        { key: 'updated',  label: 'Last Update' },
    ];

    const table = new DataTable(
        document.getElementById('sensor-table-container'),
        columns,
        { searchable: true }
    );

    // API: Replace mock data with fetch('/api/sensors').then(r => r.json()).then(data => table.setData(data))
    table.setData([
        { name: 'Temp Living',   type: 'Temperature', location: 'Living Room', value: '21.4', unit: '\u00b0C',  status: 'active',   updated: '2025-01-01 10:00' },
        { name: 'Temp Bedroom',  type: 'Temperature', location: 'Bedroom',     value: '19.8', unit: '\u00b0C',  status: 'active',   updated: '2025-01-01 10:01' },
        { name: 'Energy Main',   type: 'Energy',      location: 'Main Meter',  value: '3.2',  unit: 'kWh', status: 'active',   updated: '2025-01-01 10:02' },
        { name: 'Energy Solar',  type: 'Energy',      location: 'Roof',        value: '1.1',  unit: 'kWh', status: 'warning',  updated: '2025-01-01 09:55' },
        { name: 'Motion Hall',   type: 'Motion',      location: 'Hallway',     value: '0',    unit: '',    status: 'inactive', updated: '2025-01-01 08:30' },
    ]);
}

// ── Apartment view ───────────────────────────────────────────────────────────
function renderApartment() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Apartment</h1>
        </div>
        <div class="apartment-content">
            <!-- OPEN: floor plan / room list injected here -->
            <p class="page-placeholder">Apartment view – coming soon</p>
        </div>
    `;
}

// ── Actuators view ──────────────────────────────────────────────────────────
function renderActuators() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Actuators</h1>
        </div>
        <div class="actuators-content">
            <!-- OPEN: actuator list / controls injected here -->
            <!-- API: fetch('/api/actuators').then(r => r.json()).then(data => ...) -->
            <p class="page-placeholder">Actuators view – coming soon</p>
        </div>
    `;
}

// ── Rules view ──────────────────────────────────────────────────────────────
function renderRules() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Rules</h1>
        </div>
        <div class="rules-content">
            <!-- OPEN: rule list / editor injected here -->
            <!-- API: fetch('/api/rules').then(r => r.json()).then(data => ...) -->
            <p class="page-placeholder">Rules view – coming soon</p>
        </div>
    `;
}

// ── Users view ──────────────────────────────────────────────────────────────
function renderUsers() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Users</h1>
        </div>
        <div class="users-content">
            <!-- OPEN: user list / management injected here -->
            <!-- API: fetch('/api/users').then(r => r.json()).then(data => ...) -->
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