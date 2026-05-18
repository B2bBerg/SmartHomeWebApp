/**
 * ports/in/ILocationService.js
 *
 * Definiert den Vertrag, den der LocationService für "eingehende" Anfragen
 * (z.B. von einem Web-Controller) erfüllen muss.
 */
export class ILocationService {
    async getLocations() { throw new Error("Method not implemented"); }
    async saveLocationsBatch(locationsData) { throw new Error("Method not implemented"); }
    async getLocationTypes(groupName) { throw new Error("Method not implemented"); }
    async addLocationType(typeData) { throw new Error("Method not implemented"); }
    async addLocation(locationData) { throw new Error("Method not implemented"); }
    async updateLocation(id, locationData) { throw new Error("Method not implemented"); }
    async deleteLocation(id) { throw new Error("Method not implemented"); }
}