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
    'Apartment': 'apartment',
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
    apartment: renderApartment,
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

    const columns = [
        { key: 'id',         label: 'Device-ID', render: (val) => `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: #6c6c8a;">${val}</span>` },
        { key: 'name',       label: 'Gerätename' },
        { key: 'location',   label: 'Standort' },
        { key: 'busType',    label: 'Netzwerk' },
        { key: 'macAddress', label: 'MAC Adresse', render: (val) => val ? `<span style="font-family: monospace;">${val}</span>` : '—' },
        { key: 'busAddress', label: 'Bus Adresse', render: (val) => val ? `<span style="font-family: monospace;">${val}</span>` : '—' },
        { key: 'status',     label: 'Status', render: (val) => {
            if (val === 'active') return `<span class="badge badge--active">Active</span>`;
            if (val === 'searching') return `<span class="badge badge--searching">Searching... ⏳</span>`;
            if (val === 'not_reachable') return `<span class="badge badge--error">Not Reachable ❌</span>`;
            if (val === 'warning') return `<span class="badge badge--warning">Warning</span>`;
            return `<span class="badge badge--inactive">${val || 'Unknown'}</span>`;
        }},
        { key: 'health',     label: 'Health', render: (_, row) => {
            let html = '';
            if (row.battery !== undefined && row.battery !== null) {
                const bColor = row.battery <= 20 ? '#e64553' : (row.battery <= 50 ? '#f9e2af' : '#a6e3a1');
                html += `<span title="Batterie: ${row.battery}%" style="color: ${bColor}; font-size: 0.85em; margin-right: 8px;">🔋 ${row.battery}%</span>`;
            }
            if (row.signal !== undefined && row.signal !== null) {
                const sColor = row.signal <= 40 ? '#e64553' : (row.signal <= 70 ? '#f9e2af' : '#a6e3a1');
                html += `<span title="Signalstärke: ${row.signal}%" style="color: ${sColor}; font-size: 0.85em;">📶 ${row.signal}%</span>`;
            }
            return html !== '' ? html : '<span style="color: #6c6c8a;">—</span>';
        }},
        { key: 'ios',        label: 'IO-Ports', render: (_, row) => {
            const usedChannels = row.usedChannels || [];
            const allChannels = row.channels || row.ports || [];
            let channelsArray = [];
            
            if (Array.isArray(allChannels) && allChannels.length > 0) {
                channelsArray = allChannels;
            } else if (typeof allChannels === 'number' && allChannels > 0) {
                for (let i = 1; i <= allChannels; i++) channelsArray.push(i.toString());
            } else if (usedChannels.length > 0) {
                channelsArray = usedChannels;
            }

            if (channelsArray.length === 0) return '<span style="color: #6c6c8a;">—</span>';

            return channelsArray.map(ch => {
                const isUsed = usedChannels.includes(String(ch));
                const cssClass = isUsed ? 'io-port io-port--used' : 'io-port io-port--free';
                return `<span title="${isUsed ? 'Genutzt' : 'Frei'}" class="${cssClass}">${ch}</span>`;
            }).join('');
        }},
        { key: 'updated',    label: 'Zuletzt Online' },
    ];

    const table = new DataTable(document.getElementById('device-table-container'), columns, { searchable: true, isDevice: true });

    Promise.all([
        window.API.getDevices(),
        window.API.getSensors(),
        window.API.getActuators()
    ])
        .then(([devices, sensors, actuators]) => {
            const allDatapoints = [...sensors, ...actuators];
            const mergedDevices = devices.map(device => {
                const deviceDatapoints = allDatapoints.filter(dp => dp.deviceId === device.id);
                const usedChannels = deviceDatapoints.filter(dp => dp.channel != null).map(dp => String(dp.channel));
                return { ...device, usedChannels };
            });
            table.setData(mergedDevices);
        })
        .catch(err => console.error("Fehler beim Laden der Geräte:", err));
}

// ── Sensors view ──────────────────────────────────────────────────────────────
function renderSensors() {
    content.innerHTML = `
        <div class="page-header">
            <h1>Sensors</h1>
        </div>
        <div id="sensor-table-container"></div>
    `;

    const columns = [
        { key: 'id',       label: 'UUID', render: (val) => 
            `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: #6c6c8a;">${val ? val.split('-')[0] + '...' : '—'}</span>` 
        },
        { key: 'name',       label: 'Datenpunkt' },
        { key: 'deviceName', label: 'Gerät (Hardware)', render: (val) => 
            val ? `<span style="color: #89b4fa;">${val}</span>` : '—'
        },
        { key: 'type',       label: 'Type' },
        { key: 'location',   label: 'Location' },
        { key: 'channel',  label: 'IO-Port', render: (val) =>
            val ? `<span class="io-port io-port--assigned">${val}</span>` : '—'
        },
        { key: 'value',    label: 'Value' },
        { key: 'unit',     label: 'Unit' },
        { key: 'updated',  label: 'Last Update' },
    ];

    const table = new DataTable(
        document.getElementById('sensor-table-container'),
        columns,
        { searchable: true }
    );

    // Join Devices & Sensors
    Promise.all([window.API.getSensors(), window.API.getDevices()])
        .then(([sensors, devices]) => {
            const mergedData = sensors.map(s => {
                const dev = devices.find(d => d.id === s.deviceId) || {};
                return { ...dev, ...s, id: s.id, deviceName: dev.name };
            });
            table.setData(mergedData);
        }).catch(err => console.error("Fehler beim Laden der Sensoren:", err));
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
        <div id="actuator-table-container"></div>
    `;

    const columns = [
        { key: 'id',       label: 'UUID', render: (val) => 
            `<span title="${val}" style="font-family: monospace; font-size: 0.85em; color: #6c6c8a;">${val ? val.split('-')[0] + '...' : '—'}</span>` 
        },
        { key: 'name',       label: 'Datenpunkt' },
        { key: 'deviceName', label: 'Gerät (Hardware)', render: (val) => 
            val ? `<span style="color: #89b4fa;">${val}</span>` : '—'
        },
        { key: 'type',       label: 'Type' },
        { key: 'location',   label: 'Location' },
        { key: 'channel',  label: 'IO-Port', render: (val) =>
            val ? `<span class="io-port io-port--assigned">${val}</span>` : '—'
        },
        { key: 'value',    label: 'Value' },
        { key: 'unit',     label: 'Unit' },
        { key: 'updated',  label: 'Last Update' },
    ];

    const table = new DataTable(
        document.getElementById('actuator-table-container'),
        columns,
        { searchable: true, isActuator: true }
    );

    // Join Devices & Actuators
    Promise.all([window.API.getActuators(), window.API.getDevices()])
        .then(([actuators, devices]) => {
            const mergedData = actuators.map(a => {
                const dev = devices.find(d => d.id === a.deviceId) || {};
                return { ...dev, ...a, id: a.id, deviceName: dev.name };
            });
            table.setData(mergedData);
        }).catch(err => console.error("Fehler beim Laden der Aktoren:", err));
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