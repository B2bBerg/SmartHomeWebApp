/**
 * locations.js – Grafische Kachel-Darstellung der Gebäude-Struktur
 */
const LocationsManager = {
    init() {
        this.container = document.getElementById('locations-container');
        if (!this.container) return;
        this.isEditMode = false;
        this.createModal();
        this.loadData();
    },

    createModal() {
        if (document.getElementById('location-modal')) return;
        const modalHtml = `
            <div id="location-modal" class="table-modal hidden">
                <div class="table-modal-box">
                    <h3 id="loc-modal-title">Edit</h3>
                    <div class="settings-group">
                        <label>Name</label>
                        <input id="loc-modal-input" type="text" placeholder="Name...">
                    </div>
                    <div id="loc-modal-address-fields" style="display:none; flex-direction:column; gap:0.5rem; margin-top: 0.5rem;">
                        <div class="settings-group">
                            <label>Strasse & Hausnummer</label>
                            <div style="display:flex; gap:0.5rem;">
                                <input id="loc-modal-street" type="text" placeholder="Strasse" style="flex: 1;">
                                <input id="loc-modal-number" type="text" placeholder="Nr." style="width: 70px; flex: none;">
                            </div>
                        </div>
                        <div class="settings-group">
                            <label>PLZ & Ort</label>
                            <div style="display:flex; gap:0.5rem;">
                                <input id="loc-modal-zip" type="text" placeholder="PLZ" style="width: 90px; flex: none;">
                                <input id="loc-modal-city" type="text" placeholder="Ort" style="flex: 1;" list="loc-modal-city-list">
                                <datalist id="loc-modal-city-list"></datalist>
                            </div>
                        </div>
                        <div class="settings-group">
                            <label>Land</label>
                            <input id="loc-modal-country" type="text" placeholder="z.B. Schweiz" value="Schweiz">
                        </div>
                    </div>
                    <div class="table-modal-actions">
                        <button id="loc-modal-save" class="btn-primary">Speichern</button>
                        <button id="loc-modal-cancel">Abbrechen</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('loc-modal-zip').addEventListener('blur', async (e) => {
            const zip = e.target.value.trim();
            const country = document.getElementById('loc-modal-country').value.trim() || 'Schweiz';
            if (zip.length >= 4) {
                const cities = await window.API.lookupCityByZip(zip, country);
                const dataList = document.getElementById('loc-modal-city-list');
                dataList.innerHTML = ''; // Vorherige Einträge löschen
                if (cities && cities.length > 0) {
                    cities.forEach(city => {
                        dataList.insertAdjacentHTML('beforeend', `<option value="${city}">`);
                    });
                    
                    if (cities.length === 1) {
                        document.getElementById('loc-modal-city').value = cities[0];
                    } else {
                        document.getElementById('loc-modal-city').value = '';
                        document.getElementById('loc-modal-city').placeholder = 'Bitte wählen...';
                    }
                }
            }
        });

        document.getElementById('loc-modal-cancel').addEventListener('click', () => {
            document.getElementById('location-modal').classList.add('hidden');
        });
        document.getElementById('loc-modal-save').addEventListener('click', () => {
            if (this.modalCallback) {
                const name = document.getElementById('loc-modal-input').value.trim();
                const isBuilding = document.getElementById('loc-modal-address-fields').style.display !== 'none';
                
                if (name) {
                    if (isBuilding) {
                        const address = {
                            street: document.getElementById('loc-modal-street').value.trim(),
                            number: document.getElementById('loc-modal-number').value.trim(),
                            zip: document.getElementById('loc-modal-zip').value.trim(),
                            city: document.getElementById('loc-modal-city').value.trim(),
                            country: document.getElementById('loc-modal-country').value.trim()
                        };
                        this.modalCallback({ name, address });
                    } else {
                        this.modalCallback({ name });
                    }
                }
            }
            document.getElementById('location-modal').classList.add('hidden');
        });
    },

    openModal(type, title, defaultData, callback) {
        document.getElementById('loc-modal-title').textContent = title;
        document.getElementById('loc-modal-input').value = defaultData.name || '';
        
        const addressFields = document.getElementById('loc-modal-address-fields');
        if (type === 'building') {
            addressFields.style.display = 'flex';
            const addr = defaultData.address || {};
            document.getElementById('loc-modal-street').value = addr.street || '';
            document.getElementById('loc-modal-number').value = addr.number || '';
            document.getElementById('loc-modal-zip').value = addr.zip || '';
            document.getElementById('loc-modal-city').value = addr.city || '';
            document.getElementById('loc-modal-country').value = addr.country || 'Schweiz';
        } else {
            addressFields.style.display = 'none';
        }

        this.modalCallback = callback;
        document.getElementById('location-modal').classList.remove('hidden');
        document.getElementById('loc-modal-input').focus();
    },

    async loadData() {
        try {
            const [locationsData, devices, sensors, actuators] = await Promise.all([
                window.API.getLocations(),
                window.API.getDevices(),
                window.API.getSensors(),
                window.API.getActuators()
            ]);
            
            this.locations = locationsData;
            if (!this.locations) this.locations = [];
            
            this.allDatapoints = [...devices, ...sensors, ...actuators];
            this.renderBuildings();
        } catch (err) {
            console.error("Fehler beim Laden der Locations-Struktur:", err);
            this.container.innerHTML = `<p class="page-placeholder error">Fehler beim Laden der Struktur</p>`;
        }
    },

    async saveData() {
        await window.API.saveLocations(this.locations);
    },

    generateId(prefix) {
        const uuid = typeof generateUUID === 'function' ? generateUUID() : Date.now().toString(36);
        return `${prefix}-${uuid}`;
    },

    renderBuildings() {
        let html = `
            <div class="breadcrumb">
                <span class="breadcrumb-active">Locations</span>
                <div style="flex-grow:1"></div>
                <button id="btn-toggle-edit" class="${this.isEditMode ? 'active' : ''}" title="Edit layout"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit</button>
                <button id="btn-add-building" title="Add building"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Building</button>
            </div>
            <div class="floor-grid ${this.isEditMode ? 'edit-mode' : ''}">`;
        
        if (!this.locations || this.locations.length === 0) {
            html += `<p style="color: #6c6c8a;">Keine Gebäude gefunden.</p>`;
        } else {
            this.locations.forEach((building, index) => {
                const floorCount = building.floors ? building.floors.length : 0;
                const addressText = building.address && building.address.street 
                    ? `<span style="display:block; font-size:0.8rem; color:#a6adc8; margin-top: 5px;">${building.address.street} ${building.address.number}<br>${building.address.zip} ${building.address.city}</span>`
                    : '';
                
                html += `
                    <div class="location-card building-card" data-building="${building.id}" data-index="${index}" ${this.isEditMode ? 'draggable="true"' : ''}>
                        <div class="card-actions">
                            <button class="btn-icon btn-edit edit-building" data-id="${building.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Edit"></button>
                            <button class="btn-icon btn-delete delete-building" data-id="${building.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Remove"></button>
                        </div>
                        <h3>${building.name}</h3>
                        <p>${floorCount} Stockwerke</p>
                        ${addressText}
                    </div>
                `;
            });
        }
        
        html += `</div>`;
        this.container.innerHTML = html;
        
        document.getElementById('btn-toggle-edit').addEventListener('click', () => {
            this.isEditMode = !this.isEditMode;
            this.renderBuildings();
        });

        if (this.isEditMode) {
            let dragStartIndex = null;
            this.container.querySelectorAll('.building-card').forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    dragStartIndex = parseInt(card.dataset.index);
                    e.dataTransfer.effectAllowed = 'move';
                    card.style.opacity = '0.5';
                });
                card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
                card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });
                card.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');
                    const dragEndIndex = parseInt(card.dataset.index);
                    if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
                        const movedItem = this.locations.splice(dragStartIndex, 1)[0];
                        this.locations.splice(dragEndIndex, 0, movedItem);
                        await this.saveData();
                        this.renderBuildings();
                    }
                });
                card.addEventListener('dragend', () => { card.style.opacity = '1'; });
            });
        }

        document.getElementById('btn-add-building').addEventListener('click', () => {
            this.openModal('building', 'Add Building', { name: '' }, async (data) => {
                this.locations.push({ id: this.generateId('b'), name: data.name, address: data.address, floors: [] });
                await this.saveData();
                this.renderBuildings();
            });
        });

        this.container.querySelectorAll('.edit-building').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const b = this.locations.find(x => x.id === btn.dataset.id);
                this.openModal('building', 'Edit Building', { name: b.name, address: b.address }, async (data) => {
                    b.name = data.name;
                    b.address = data.address;
                    await this.saveData();
                    this.renderBuildings();
                });
            });
        });

        this.container.querySelectorAll('.delete-building').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Gebäude wirklich löschen?')) {
                    this.locations = this.locations.filter(x => x.id !== btn.dataset.id);
                    await this.saveData();
                    this.renderBuildings();
                }
            });
        });

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
        
        const addressText = building.address && building.address.street 
            ? `<div style="font-size:0.85rem; color:#a6adc8; font-weight: normal; margin-top: 4px;">${building.address.street} ${building.address.number}, ${building.address.zip} ${building.address.city}</div>`
            : '';

        let html = `
            <div class="breadcrumb" style="align-items:flex-start;">
                <div style="display:flex; flex-direction:column;">
                    <div>
                        <span id="bc-locations" style="cursor:pointer;">Locations</span>
                        <span class="breadcrumb-sep">/</span>
                        <span class="breadcrumb-active">${building.name}</span>
                    </div>
                    ${addressText}
                </div>
                <div style="flex-grow:1"></div>
                <button id="btn-toggle-edit" class="${this.isEditMode ? 'active' : ''}" title="Edit layout"><img src="assets/icons/gear-svgrepo-com.svg" alt="edit">Edit</button>
                <button id="btn-add-floor" title="Add floor"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Floor</button>
            </div>
        `;

        if (!building.floors) building.floors = [];

        if (building.floors.length === 0) {
            html += `<p style="color: #6c6c8a;">Keine Stockwerke konfiguriert.</p>`;
            html += `<div id="rooms-container" class="floor-grid ${this.isEditMode ? 'edit-mode' : ''}"></div>`;
        } else {
            html += `<div class="floors-tabs ${this.isEditMode ? 'edit-mode' : ''}">`;
            building.floors.forEach((floor, index) => {
                html += `
                    <div class="floor-tab-wrapper" data-floor="${floor.id}" data-index="${index}" ${this.isEditMode ? 'draggable="true"' : ''}>
                        <button class="floor-tab">${floor.name}</button>
                        <button class="btn-icon btn-edit edit-floor" data-id="${floor.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Edit"></button>
                        <button class="btn-icon btn-delete delete-floor" data-id="${floor.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Remove"></button>
                    </div>`;
            });
            html += `</div>`;
            html += `<div id="rooms-container" class="floor-grid ${this.isEditMode ? 'edit-mode' : ''}"></div>`;
        }
        
        this.container.innerHTML = html;
        document.getElementById('bc-locations').addEventListener('click', () => this.renderBuildings());
        
        document.getElementById('btn-toggle-edit').addEventListener('click', () => {
            this.isEditMode = !this.isEditMode;
            this.renderBuildingDetails(building);
        });

        document.getElementById('btn-add-floor').addEventListener('click', () => {
            this.openModal('floor', 'Add Floor', { name: '' }, async (data) => {
                building.floors.push({ id: this.generateId('f'), name: data.name, rooms: [] });
                await this.saveData();
                this.renderBuildingDetails(building);
            });
        });

        if (building.floors.length > 0) {
            this.container.querySelectorAll('.edit-floor').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const f = building.floors.find(x => x.id === btn.dataset.id);
                    this.openModal('floor', 'Edit Floor', { name: f.name }, async (data) => {
                        f.name = data.name;
                        await this.saveData();
                        this.renderBuildingDetails(building);
                    });
                });
            });

            this.container.querySelectorAll('.delete-floor').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Stockwerk wirklich löschen?')) {
                        building.floors = building.floors.filter(x => x.id !== btn.dataset.id);
                        await this.saveData();
                        this.renderBuildingDetails(building);
                    }
                });
            });

            const tabs = this.container.querySelectorAll('.floor-tab-wrapper');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    if(e.target.tagName === 'BUTTON' && e.target.classList.contains('btn-icon')) return;
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const floorId = tab.dataset.floor;
                    this.activeFloorId = floorId;
                    const floor = building.floors.find(f => f.id === floorId);
                    if (floor) this.renderRooms(floor, building);
                });
            });

            let activeFloor = building.floors.find(f => f.id === this.activeFloorId);
            if (!activeFloor && building.floors.length > 0) activeFloor = building.floors[0];
            if (activeFloor) {
                const activeTab = this.container.querySelector(`.floor-tab-wrapper[data-floor="${activeFloor.id}"]`);
                if (activeTab) activeTab.classList.add('active');
                this.renderRooms(activeFloor, building);
            }

            if (this.isEditMode) {
                let dragStartFloor = null;
                this.container.querySelectorAll('.floor-tab-wrapper').forEach(tab => {
                    tab.addEventListener('dragstart', (e) => {
                        dragStartFloor = parseInt(tab.dataset.index);
                        e.dataTransfer.effectAllowed = 'move';
                        tab.style.opacity = '0.5';
                    });
                    tab.addEventListener('dragover', (e) => { e.preventDefault(); tab.classList.add('drag-over'); });
                    tab.addEventListener('dragleave', () => { tab.classList.remove('drag-over'); });
                    tab.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        tab.classList.remove('drag-over');
                        const dragEndFloor = parseInt(tab.dataset.index);
                        if (dragStartFloor !== null && dragStartFloor !== dragEndFloor) {
                            const movedItem = building.floors.splice(dragStartFloor, 1)[0];
                            building.floors.splice(dragEndFloor, 0, movedItem);
                            await this.saveData();
                            this.renderBuildingDetails(building);
                        }
                    });
                    tab.addEventListener('dragend', () => { tab.style.opacity = '1'; });
                });
            }
        }
    },

    renderRooms(floor, building) {
        const roomsContainer = document.getElementById('rooms-container');
        if (!roomsContainer) return;

        if (!floor.rooms) floor.rooms = [];

        let html = `
            <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h3 style="color: #cdd6f4; margin: 0; font-size: 1.1rem;">Räume in ${floor.name}</h3>
                <button id="btn-add-room" title="Add room"><img src="assets/icons/grid-plus-svgrepo-com.svg" alt="add">Add Room</button>
            </div>
        `;

        if (floor.rooms.length === 0) {
            html += `<p style="color: #6c6c8a; grid-column: 1 / -1;">Keine Räume in diesem Stockwerk konfiguriert.</p>`;
        } else {
            floor.rooms.forEach((room, index) => {
                const devCount = this.allDatapoints.filter(dp => dp.location === room.name || dp.location === room.id).length;
                html += `
                    <div class="location-card room-card" data-room="${room.id}" data-index="${index}" ${this.isEditMode ? 'draggable="true"' : ''}>
                        <div class="card-actions">
                            <button class="btn-icon btn-edit edit-room" data-id="${room.id}"><img src="assets/icons/gear-svgrepo-com.svg" alt="Edit"></button>
                            <button class="btn-icon btn-delete delete-room" data-id="${room.id}"><img src="assets/icons/trash-svgrepo-com.svg" alt="Remove"></button>
                        </div>
                        <h3>${room.name}</h3>
                        <p>${devCount} Geräte / Sensoren</p>
                    </div>`;
            });
        }
        roomsContainer.innerHTML = html;

        if (this.isEditMode) {
            let dragStartRoom = null;
            roomsContainer.querySelectorAll('.room-card').forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    dragStartRoom = parseInt(card.dataset.index);
                    e.dataTransfer.effectAllowed = 'move';
                    card.style.opacity = '0.5';
                });
                card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
                card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });
                card.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');
                    const dragEndRoom = parseInt(card.dataset.index);
                    if (dragStartRoom !== null && dragStartRoom !== dragEndRoom) {
                        const movedItem = floor.rooms.splice(dragStartRoom, 1)[0];
                        floor.rooms.splice(dragEndRoom, 0, movedItem);
                        await this.saveData();
                        this.renderRooms(floor, building);
                    }
                });
                card.addEventListener('dragend', () => { card.style.opacity = '1'; });
            });
        }

        document.getElementById('btn-add-room').addEventListener('click', () => {
            this.openModal('room', 'Add Room', { name: '' }, async (data) => {
                floor.rooms.push({ id: this.generateId('r'), name: data.name });
                await this.saveData();
                this.renderRooms(floor, building);
            });
        });

        roomsContainer.querySelectorAll('.edit-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const r = floor.rooms.find(x => x.id === btn.dataset.id);
                this.openModal('room', 'Edit Room', { name: r.name }, async (data) => {
                    r.name = data.name;
                    await this.saveData();
                    this.renderRooms(floor, building);
                });
            });
        });

        roomsContainer.querySelectorAll('.delete-room').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Raum wirklich löschen?')) {
                    floor.rooms = floor.rooms.filter(x => x.id !== btn.dataset.id);
                    await this.saveData();
                    this.renderRooms(floor, building);
                }
            });
        });
    }
};
window.LocationsManager = LocationsManager;