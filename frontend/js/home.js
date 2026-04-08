/**
 * home.js – Grafische Kachel-Darstellung der Haus-Struktur
 */
const HomeManager = {
    init() {
        this.container = document.getElementById('home-container');
        if (!this.container) return;
        this.loadData();
    },

    async loadData() {
        try {
            // Lade Struktur sowie alle Datenpunkte, um die Anzahl anzuzeigen
            const [locations, devices, sensors, actuators] = await Promise.all([
                window.API.getLocations(),
                window.API.getDevices(),
                window.API.getSensors(),
                window.API.getActuators()
            ]);
            
            this.locations = locations;
            this.allDatapoints = [...devices, ...sensors, ...actuators];
            
            this.renderFloors();
        } catch (err) {
            console.error("Fehler beim Laden der Home-Struktur:", err);
            this.container.innerHTML = `<p class="page-placeholder error">Fehler beim Laden der Haus-Struktur</p>`;
        }
    },

    renderFloors() {
        let html = `<div class="floor-grid">`;
        
        if (this.locations.length === 0) {
            html += `<p style="color: #6c6c8a;">Keine Stockwerke gefunden. Bitte Konfiguration überprüfen.</p>`;
        }

        this.locations.forEach(floor => {
            const roomCount = floor.rooms ? floor.rooms.length : 0;
            html += `
                <div class="home-card" data-floor="${floor.id}">
                    <h3>${floor.name}</h3>
                    <p>${roomCount} Räume</p>
                </div>
            `;
        });
        
        html += `</div>`;
        this.container.innerHTML = html;
        
        // Event Listener für Stockwerke
        this.container.querySelectorAll('.home-card').forEach(card => {
            card.addEventListener('click', () => {
                const floorId = card.dataset.floor;
                const floor = this.locations.find(f => f.id === floorId);
                if (floor) this.renderRooms(floor);
            });
        });
    },

    renderRooms(floor) {
        let html = `
            <div class="breadcrumb">
                <span id="bc-home">🏠 Home</span>
                <span class="breadcrumb-sep">/</span>
                <span class="breadcrumb-active">${floor.name}</span>
            </div>
            <div class="floor-grid">
        `;
        
        if (!floor.rooms || floor.rooms.length === 0) {
            html += `<p style="color: #6c6c8a; grid-column: 1 / -1;">Keine Räume konfiguriert.</p>`;
        } else {
            floor.rooms.forEach(room => {
                const devCount = this.allDatapoints.filter(dp => dp.location === room.name).length;
                html += `<div class="home-card room-card" data-room="${room.name}"><h3>${room.name}</h3><p>${devCount} Geräte / Sensoren</p></div>`;
            });
        }
        
        html += `</div>`;
        this.container.innerHTML = html;
        document.getElementById('bc-home').addEventListener('click', () => this.renderFloors());
    }
};