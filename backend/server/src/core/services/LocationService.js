import { ILocationService } from '../../ports/in/ILocationService.js';
import { Location } from '../domain/Location.js';

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

    async saveLocationsBatch(locationsData) {
        return await this.locationRepository.saveLocationsBatch(locationsData);
    }

    async getLocationTypes(groupName) {
        return await this.locationRepository.getLocationTypes(groupName);
    }

    async addLocationType(typeData) {
        return await this.locationRepository.addLocationType(typeData);
    }

    async addLocation(locationData) {
        // Geschäftslogik: Erstelle und validiere das Domänenobjekt
        const location = new Location(locationData);
        location.validate();
        // TODO: Hier könnte man auch die Hierarchie validieren (z.B. Raum darf nicht in Gebäude)
        return await this.locationRepository.addLocation(location);
    }

    async updateLocation(id, locationData) {
        const location = new Location({ ...locationData, id });
        location.validate();
        return await this.locationRepository.updateLocation(id, location);
    }

    async deactivateLocation(id) {
        return await this.locationRepository.deactivateLocation(id);
    }
}