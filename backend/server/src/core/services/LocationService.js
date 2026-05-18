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
        return await this.locationRepository.addLocation(locationData);
    }

    async updateLocation(id, locationData) {
        return await this.locationRepository.updateLocation(id, locationData);
    }

    async deleteLocation(id) {
        return await this.locationRepository.deleteLocation(id);
    }
}