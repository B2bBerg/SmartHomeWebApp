/**
 * overview.js - Korrigierte & Finalisierte Logik
 */

const GridManager = {
    MAX_COL: 6,
    MAX_ROW: 3,
    COLS: 6,
    dragSrc: null,
    editMode: false,
    hoveredGhost: null,

    init() {
        this.container = document.querySelector('.overview-container');
        this.modal = document.getElementById('tile-modal');
        this.modalInput = document.getElementById('tile-modal-input');
        
        this.setupEventListeners();
        
        // Initialisiere bestehende Tiles im HTML
        this.container.querySelectorAll('.dynamic-tile').forEach(tile => {
            if (!tile.dataset.id) tile.dataset.id = Date.now() + Math.random();
            this.initTile(tile);
        });

        // WICHTIG: Geister werden erst beim Einschalten des Edit-Mode sichtbar
        this.refreshGhosts();
    },

    // --- JSON INTERFACE ---
    
    /**
     * Lädt ein Dashboard aus einem JSON-Array
     * @param {Array} jsonData - Das Array mit Tile-Objekten
     */
    loadDashboard(jsonData) {
        // 1. Bestehende Kacheln entfernen
        this.container.querySelectorAll('.dynamic-tile').forEach(t => t.remove());
        
        // 2. Jede Kachel aus dem JSON erstellen
        if (Array.isArray(jsonData)) {
            jsonData.forEach(config => {
                this.addNewTile(config);
            });
        }
        
        console.log("Dashboard erfolgreich geladen.");
        this.refreshGhosts();
    },
    
    /**
     * Erzeugt einen JSON-String des aktuellen Zustands
     * @returns {string} JSON-String
     */
    saveDashboard() {
        const state = this.getDashboardState();
        const jsonString = JSON.stringify(state, null, 2);
        
        // In der Konsole ausgeben (zum Testen)
        console.log("Speichere folgenden Stand:", jsonString);
        
        // HIER würde später dein Fetch-API Call an die Datenbank kommen:
        /*
        fetch('/api/save-dashboard', {
            method: 'POST',
            body: jsonString,
            headers: { 'Content-Type': 'application/json' }
        });
        */
        
        return jsonString;
    },
    
    setupEventListeners() {
        const editBtn = document.getElementById('edit-mode-btn');
        editBtn.addEventListener('click', () => {
            this.editMode = !this.editMode;
            editBtn.classList.toggle('active', this.editMode);
            this.container.classList.toggle('edit-mode', this.editMode);
            
            this.container.querySelectorAll('.dynamic-tile').forEach(t => t.draggable = this.editMode);
            
            const icon = this.editMode 
                ? 'assets/icons/circle-exclamation-check-svgrepo-com.svg' 
                : 'assets/icons/gear-svgrepo-com.svg';
            editBtn.querySelector('img').src = icon;
            
            // Geister neu zeichnen, wenn Modus wechselt
            this.refreshGhosts();
        });

        document.getElementById('add-tile-btn').addEventListener('click', () => {
            this.modalInput.value = '';
            this.modal.classList.remove('hidden');
            this.modalInput.focus();
        });

        document.getElementById('tile-modal-confirm').addEventListener('click', () => this.addNewTile());
        document.getElementById('tile-modal-cancel').addEventListener('click', () => this.modal.classList.add('hidden'));

        this.container.addEventListener('dragover', e => this.handleContainerDragOver(e));
        this.container.addEventListener('dragleave', e => this.handleContainerDragLeave(e));
        this.container.addEventListener('drop', e => this.handleContainerDrop(e));
    },

    addNewTile(config = null) {
        const label = config ? config.label : this.modalInput.value.trim();
        if (!label) return;
    
        const tile = document.createElement('div');
        tile.className = 'tile dynamic-tile';
        tile.dataset.id = config ? config.id : Date.now();
        tile.innerHTML = this.createTileHTML(label);
    
        // Wir brauchen temporär Geister, um einen Platz zu finden, auch wenn Edit-Mode aus ist
        const occupied = this.getOccupied(null);
        
        if (config) {
            tile.dataset.gridCol = config.col;
            tile.dataset.gridRow = config.row;
            tile.dataset.colSpan = config.colSpan;
            tile.dataset.rowSpan = config.rowSpan;
        } else {
            // Suche manuell nach dem ersten freien Slot (R,C)
            let foundPos = { r: 1, c: 1 };
            let found = false;
            for (let r = 1; r < 100 && !found; r++) {
                for (let c = 1; c <= this.COLS && !found; c++) {
                    if (!occupied.has(`${r},${c}`)) {
                        foundPos = { r, c };
                        found = true;
                    }
                }
            }
            tile.dataset.gridCol = foundPos.c;
            tile.dataset.gridRow = foundPos.r;
            tile.dataset.colSpan = 1;
            tile.dataset.rowSpan = 1;
        }
    
        this.container.appendChild(tile);
        this.initTile(tile);
        if (this.editMode) tile.draggable = true;
        this.refreshGhosts();
        this.modal.classList.add('hidden');
    },

    initTile(tile) {
        tile.dataset.colSpan = tile.dataset.colSpan || 1;
        tile.dataset.rowSpan = tile.dataset.rowSpan || 1;

        tile.addEventListener('dragstart', (e) => {
            this.dragSrc = tile;
            setTimeout(() => tile.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); 
        });

        tile.addEventListener('dragend', () => {
            tile.classList.remove('dragging');
            this.refreshGhosts();
        });

        tile.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.dragSrc && this.dragSrc !== tile) {
                if (this.dragSrc.dataset.colSpan === tile.dataset.colSpan &&
                    this.dragSrc.dataset.rowSpan === tile.dataset.rowSpan) {
                    const tempC = this.dragSrc.dataset.gridCol;
                    const tempR = this.dragSrc.dataset.gridRow;
                    this.dragSrc.dataset.gridCol = tile.dataset.gridCol;
                    this.dragSrc.dataset.gridRow = tile.dataset.gridRow;
                    tile.dataset.gridCol = tempC;
                    tile.dataset.gridRow = tempR;
                    this.applyPosition(this.dragSrc);
                    this.applyPosition(tile);
                    this.refreshGhosts();
                } else {
                    this.showError(tile, 'Nur bei gleicher Größe tauschbar');
                }
            }
        });

        this.attachTileControls(tile);
        this.applyPosition(tile);
        tile._updateResizeButtons = () => this.updateResizeButtons(tile);
    },

    refreshGhosts() {
        // Bestehende Geister löschen
        this.container.querySelectorAll('.ghost-tile').forEach(g => g.remove());
        
        // Geister nur im Edit-Mode erstellen
        if (!this.editMode) return;

        let maxRow = 1;
        this.container.querySelectorAll('.dynamic-tile').forEach(el => {
            maxRow = Math.max(maxRow, (+el.dataset.gridRow) + (+el.dataset.rowSpan));
        });
        maxRow += 3;

        for (let r = 1; r <= maxRow; r++) {
            for (let c = 1; c <= this.COLS; c++) {
                const ghost = document.createElement('div');
                ghost.className = 'ghost-tile';
                ghost.dataset.gridCol = c; 
                ghost.dataset.gridRow = r;
                ghost.style.gridColumn = `${c} / span 1`;
                ghost.style.gridRow = `${r} / span 1`;
                this.container.appendChild(ghost);
            }
        }
        this.container.querySelectorAll('.dynamic-tile').forEach(t => this.updateResizeButtons(t));
    },

    // --- Kern-Logik (unverändert aber geprüft) ---
    getOccupied(skipEl) {
        const occupied = new Set();
        this.container.querySelectorAll('.dynamic-tile').forEach(el => {
            if (el === skipEl) return;
            const c = +el.dataset.gridCol, r = +el.dataset.gridRow;
            const cs = +el.dataset.colSpan, rs = +el.dataset.rowSpan;
            for (let rc = r; rc < r + rs; rc++)
                for (let cc = c; cc < c + cs; cc++)
                    occupied.add(`${rc},${cc}`);
        });
        return occupied;
    },

    isAreaOccupied(startRow, startCol, rowSpan, colSpan, skipEl) {
        const occupied = this.getOccupied(skipEl);
        for (let r = startRow; r < startRow + rowSpan; r++) {
            for (let c = startCol; c < startCol + colSpan; c++) {
                if (occupied.has(`${r},${c}`)) return true;
            }
        }
        return false;
    },

    applyPosition(el) {
        el.style.gridColumn = `${el.dataset.gridCol} / span ${el.dataset.colSpan}`;
        el.style.gridRow = `${el.dataset.gridRow} / span ${el.dataset.rowSpan}`;
    },

    updateResizeButtons(tile) {
        const c = +tile.dataset.gridCol, r = +tile.dataset.gridRow;
        const cs = +tile.dataset.colSpan, rs = +tile.dataset.rowSpan;
        const canGrowCol = cs < this.MAX_COL && !this.isAreaOccupied(r, c + cs, rs, 1, tile);
        const canGrowRow = rs < this.MAX_ROW && !this.isAreaOccupied(r + rs, c, 1, cs, tile);
        tile.querySelector('.col-plus').style.visibility = canGrowCol ? 'visible' : 'hidden';
        tile.querySelector('.col-minus').style.visibility = cs > 1 ? 'visible' : 'hidden';
        tile.querySelector('.row-plus').style.visibility = canGrowRow ? 'visible' : 'hidden';
        tile.querySelector('.row-minus').style.visibility = rs > 1 ? 'visible' : 'hidden';
    },

    attachTileControls(tile) {
        const applySpan = () => { this.applyPosition(tile); this.refreshGhosts(); };
        tile.querySelector('.col-plus').addEventListener('click', e => {
            const c = +tile.dataset.gridCol, r = +tile.dataset.gridRow, cs = +tile.dataset.colSpan, rs = +tile.dataset.rowSpan;
            if (cs < this.MAX_COL && !this.isAreaOccupied(r, c + cs, rs, 1, tile)) { tile.dataset.colSpan = cs + 1; applySpan(); }
        });
        tile.querySelector('.col-minus').addEventListener('click', e => {
            if (+tile.dataset.colSpan > 1) { tile.dataset.colSpan--; applySpan(); }
        });
        tile.querySelector('.row-plus').addEventListener('click', e => {
            const c = +tile.dataset.gridCol, r = +tile.dataset.gridRow, cs = +tile.dataset.colSpan, rs = +tile.dataset.rowSpan;
            if (rs < this.MAX_ROW && !this.isAreaOccupied(r + rs, c, 1, cs, tile)) { tile.dataset.rowSpan = rs + 1; applySpan(); }
        });
        tile.querySelector('.row-minus').addEventListener('click', e => {
            if (+tile.dataset.rowSpan > 1) { tile.dataset.rowSpan--; applySpan(); }
        });
        tile.querySelector('.tile-remove').addEventListener('click', () => { tile.remove(); this.refreshGhosts(); });
    },

    handleContainerDragOver(e) {
        e.preventDefault();
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const ghost = els.find(el => el.classList.contains('ghost-tile'));
        if (ghost !== this.hoveredGhost) {
            if (this.hoveredGhost) this.hoveredGhost.classList.remove('drag-over');
            this.hoveredGhost = ghost || null;
            if (this.hoveredGhost) this.hoveredGhost.classList.add('drag-over');
        }
    },

    handleContainerDragLeave(e) {
        if (!this.container.contains(e.relatedTarget)) {
            if (this.hoveredGhost) this.hoveredGhost.classList.remove('drag-over');
            this.hoveredGhost = null;
        }
    },

    handleContainerDrop(e) {
        e.preventDefault();
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const ghost = els.find(el => el.classList.contains('ghost-tile'));
        if (!this.dragSrc || !ghost) return;
        const c = +ghost.dataset.gridCol, r = +ghost.dataset.gridRow;
        const cs = +this.dragSrc.dataset.colSpan, rs = +this.dragSrc.dataset.rowSpan;
        if (c + cs - 1 <= this.COLS && !this.isAreaOccupied(r, c, rs, cs, this.dragSrc)) {
            this.dragSrc.dataset.gridCol = c; this.dragSrc.dataset.gridRow = r;
            this.applyPosition(this.dragSrc);
        } else {
            this.showError(this.dragSrc, 'Platz belegt oder zu breit');
        }
        this.cleanupDrag();
    },

    cleanupDrag() {
        if (this.hoveredGhost) this.hoveredGhost.classList.remove('drag-over');
        this.hoveredGhost = null;
        this.refreshGhosts();
    },

    createTileHTML(label) {
        return `<span class="tile-label">${label}</span>
        <div class="tile-controls">
            <div class="tile-resize"><button class="col-minus">◀</button><button class="col-plus">▶</button><button class="row-minus">▲</button><button class="row-plus">▼</button></div>
            <button class="tile-remove">✕</button>
        </div>`;
    },

    showError(target, msg) {
        const err = document.createElement('div');
        err.className = 'swap-error';
        err.textContent = msg;
        target.appendChild(err);
        setTimeout(() => err.remove(), 2000);
    },

    // JSON Export für später
    getDashboardState() {
        return Array.from(this.container.querySelectorAll('.dynamic-tile')).map(tile => ({
            id: tile.dataset.id,
            label: tile.querySelector('.tile-label').textContent,
            col: parseInt(tile.dataset.gridCol),
            row: parseInt(tile.dataset.gridRow),
            colSpan: parseInt(tile.dataset.colSpan),
            rowSpan: parseInt(tile.dataset.rowSpan)
        }));
    }
};

document.addEventListener('DOMContentLoaded', () => GridManager.init());