/**
 * locations.js – Grafische Kachel-Darstellung der Gebäude-Struktur
 */
const LocationsManager = {
    init() {
        this.container = document.getElementById('locations-container');
        if (!this.container) return;
        this.loadData();
    },

    async loadData() {
        try {
            const [locationsData, devices, sensors, actuators] = await Promise.all([
                window.API.getLocations(),
                window.API.getDevices(),
                window.API.getSensors(),
                window.API.getActuators()
            ]);
            
            // Rückwärtskompatibilität: Falls API nur Stockwerke (ohne floors-Array) zurückgibt
            if (locationsData.length > 0 && !locationsData[0].floors) {
                 this.locations = [{
                     id: 'b-default',
                     name: 'Haupthaus',
                     floors: locationsData
                 }];
            } else {
                 this.locations = locationsData;
            }
            
            this.allDatapoints = [...devices, ...sensors, ...actuators];
            this.renderBuildings();
        } catch (err) {
            console.error("Fehler beim Laden der Locations-Struktur:", err);
            this.container.innerHTML = `<p class="page-placeholder error">Fehler beim Laden der Struktur</p>`;
        }
    },

    renderBuildings() {
        let html = `
            <div class="breadcrumb">
                <span class="breadcrumb-active">🏠 Locations</span>
            </div>
            <div class="floor-grid">`;
        
        if (!this.locations || this.locations.length === 0) {
            html += `<p style="color: #6c6c8a;">Keine Gebäude gefunden.</p>`;
        } else {
            this.locations.forEach(building => {
                const floorCount = building.floors ? building.floors.length : 0;
                html += `
                    <div class="location-card building-card" data-building="${building.id}">
                        <h3>${building.name}</h3>
                        <p>${floorCount} Stockwerke</p>
                    </div>
                `;
            });
        }
        
        html += `</div>`;
        this.container.innerHTML = html;
        
        this.container.querySelectorAll('.building-card').forEach(card => {
            card.addEventListener('click', () => {
                const buildingId = card.dataset.building;
                const building = this.locations.find(b => b.id === buildingId);
                if (building) this.renderBuildingDetails(building);
            });
        });
    },

    renderBuildingDetails(building) {
        const defaultFloor = (building.floors && building.floors.length > 0) ? building.floors[0] : null;
        
        let html = `
            <div class="breadcrumb">
                <span id="bc-locations">🏠 Locations</span>
                <span class="breadcrumb-sep">/</span>
                <span class="breadcrumb-active">${building.name}</span>
            </div>
        `;

        if (!building.floors || building.floors.length === 0) {
            html += `<p style="color: #6c6c8a;">Keine Stockwerke konfiguriert.</p>`;
            this.container.innerHTML = html;
            document.getElementById('bc-locations').addEventListener('click', () => this.renderBuildings());
            return;
        }

        html += `<div class="floors-tabs">`;
        building.floors.forEach(floor => {
            html += `<button class="floor-tab" data-floor="${floor.id}">${floor.name}</button>`;
        });
        html += `</div>`;
        
        html += `<div id="rooms-container" class="floor-grid"></div>`;
        
        this.container.innerHTML = html;
        document.getElementById('bc-locations').addEventListener('click', () => this.renderBuildings());
        
        const tabs = this.container.querySelectorAll('.floor-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const floorId = tab.dataset.floor;
                const floor = building.floors.find(f => f.id === floorId);
                if (floor) this.renderRooms(floor);
            });
        });

        if (defaultFloor) {
            this.container.querySelector(`.floor-tab[data-floor="${defaultFloor.id}"]`).classList.add('active');
            this.renderRooms(defaultFloor);
        }
    },

    renderRooms(floor) {
        const roomsContainer = document.getElementById('rooms-container');
        if (!roomsContainer) return;

        let html = '';
        if (!floor.rooms || floor.rooms.length === 0) {
            html = `<p style="color: #6c6c8a; grid-column: 1 / -1;">Keine Räume in diesem Stockwerk konfiguriert.</p>`;
        } else {
            floor.rooms.forEach(room => {
                const devCount = this.allDatapoints.filter(dp => dp.location === room.name).length;
                html += `<div class="location-card room-card" data-room="${room.name}"><h3>${room.name}</h3><p>${devCount} Geräte / Sensoren</p></div>`;
            });
        }
        roomsContainer.innerHTML = html;
    }
};
window.LocationsManager = LocationsManager;