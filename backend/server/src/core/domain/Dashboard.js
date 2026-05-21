import { ValidationError } from '../errors/ValidationError.js';

export class Dashboard {
    constructor({ id, name, slug, locationId, userId, sortOrder, tiles = [] }) {
        this.id = id;
        this.name = name || 'Dashboard'; // Fallback-Name
        this.slug = slug;
        this.locationId = locationId;
        this.userId = userId;
        this.sortOrder = sortOrder;
        this.tiles = tiles; // Liste von Kacheln
    }

    validate() {
        if (!this.name || this.name.trim() === '') {
            throw new ValidationError("Der Name des Dashboards darf nicht leer sein.");
        }
        if (!this.slug && !this.id) {
            throw new ValidationError("Ein Slug oder eine ID ist für das Dashboard zwingend erforderlich.");
        }
        if (Array.isArray(this.tiles)) {
            for (const tile of this.tiles) {
                if (!tile.tileTypeId && !tile.tileTypeName) {
                    throw new ValidationError("Jede Kachel benötigt einen definierten Typ (tileTypeId oder tileTypeName).");
                }
            }
        }
    }
}