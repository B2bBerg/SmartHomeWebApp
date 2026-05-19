/**
 * ports/out/ILocationRepository.js
 *
 * Definiert den Vertrag, den ein "ausgehender" Adapter (z.B. ein Datenbank-Adapter)
 * erfüllen muss, damit der Core mit ihm arbeiten kann.
 */
export class ILocationRepository {
    async getLocations() { throw new Error("Method not implemented"); }
    async saveLocationsBatch(locationsData) { throw new Error("Method not implemented"); }
    async getLocationTypes(groupName) { throw new Error("Method not implemented"); }
    async addLocationType(typeData) { throw new Error("Method not implemented"); }
    async addLocation(locationData) { throw new Error("Method not implemented"); }
    async updateLocation(id, locationData) { throw new Error("Method not implemented"); }
    async deactivateLocation(id) { throw new Error("Method not implemented"); }
}