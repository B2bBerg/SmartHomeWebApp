/**
 * adapters/in/web/LocationController.js
 *
 * Nimmt HTTP-Anfragen entgegen und ruft die entsprechende Methode im Service auf.
 * Übersetzt zwischen der "Web-Welt" (req, res) und der "Core-Welt".
 */
export class LocationController {
    constructor(locationService) {
        this.locationService = locationService;
    }

    async getAllLocations(req, res) {
        const locations = await this.locationService.getLocations();
        res.json(locations);
    }

    async batchUpdateLocations(req, res) {
        const result = await this.locationService.saveLocationsBatch(req.body);
        res.json(result);
    }

    async getLocationTypes(req, res) {
        const types = await this.locationService.getLocationTypes(req.query.group);
        res.json(types);
    }

    async addLocationType(req, res) {
        const result = await this.locationService.addLocationType(req.body);
        res.status(201).json(result);
    }

    async addLocation(req, res) {
        const result = await this.locationService.addLocation(req.body);
        res.status(201).json(result);
    }

    async updateLocation(req, res) {
        const result = await this.locationService.updateLocation(req.params.id, req.body);
        res.json(result);
    }

    async deleteLocation(req, res) {
        const result = await this.locationService.deleteLocation(req.params.id);
        res.json(result);
    }
}