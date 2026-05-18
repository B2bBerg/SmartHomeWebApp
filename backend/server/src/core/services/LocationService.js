import { ILocationService } from '../../ports/in/ILocationService.js';

/**
 * core/services/LocationService.js
 *
 * Implementiert die Geschäftslogik für Locations.
 * Hängt NUR von Ports ab, niemals von konkreten Adaptern.
 */
export class LocationService extends ILocationService {
    
    // Der Service erhält seine Abhängigkeiten (hier das Repository) von aussen.
    // Das nennt man "Dependency Injection".
    constructor(locationRepository) {
        super();
        this.locationRepository = locationRepository;
    }

    async getLocations() {
        return await this.locationRepository.getLocations();
    }
}