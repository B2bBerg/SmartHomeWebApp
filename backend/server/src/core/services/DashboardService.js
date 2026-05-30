import { IDashboardService } from '../../ports/in/IDashboardService.js';
import { Dashboard } from '../domain/Dashboard.js';

export class DashboardService extends IDashboardService {
    constructor(dashboardRepository) {
        super();
        this.dashboardRepository = dashboardRepository;
    }

    async getAllDashboards() {
        return await this.dashboardRepository.getAllDashboards();
    }

    async getDashboard(idOrSlug) {
        let dashboardData;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        
        if (isUuid) {
            dashboardData = await this.dashboardRepository.getDashboardById(idOrSlug);
        } else {
            dashboardData = await this.dashboardRepository.getDashboardBySlug(idOrSlug);
        }

        if (!dashboardData) {
            const error = new Error("Dashboard not found");
            error.status = 404;
            throw error;
        }
        return dashboardData;
    }

    async saveDashboard(idOrSlug, dashboardData) {
        const dashboard = new Dashboard({ ...dashboardData, slug: idOrSlug });
        
        // Auto-Link Location: Falls das Dashboard zu einem Standort gehört (slug: dashboard_room_<uuid> etc.)
        if (idOrSlug && idOrSlug.startsWith('dashboard_')) {
            const parts = idOrSlug.split('_');
            if (parts.length >= 3) {
                const potentialLocationId = parts.slice(2).join('_'); // Extrahiert die UUID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialLocationId);
                if (isUuid) {
                    dashboard.locationId = potentialLocationId;
                }
            }
        }

        dashboard.validate();
        return await this.dashboardRepository.saveDashboard(dashboard);
    }

    async getDashboardTiles(idOrSlug) {
        return await this.dashboardRepository.getDashboardTilesBySlug(idOrSlug);
    }

    async saveDashboardTiles(idOrSlug, tilesData) {
        // Sicherstellen, dass das übergeordnete Dashboard (app_page) existiert
        try {
            await this.getDashboard(idOrSlug);
        } catch (error) {
            if (error.status === 404) {
                // Auto-Create des Subdashboards, wenn es noch nicht existiert
                let name = idOrSlug.includes('_building_') ? 'Gebäude-Dashboard' : (idOrSlug.includes('_floor_') ? 'Etagen-Dashboard' : 'Raum-Dashboard');
                await this.saveDashboard(idOrSlug, { name });
            } else {
                throw error; // Andere Fehler (z.B. Datenbank-Ausfall) durchreichen
            }
        }
        
        return await this.dashboardRepository.saveDashboardTiles(idOrSlug, tilesData);
    }

    async deleteDashboard(idOrSlug) {
        const dashboard = await this.getDashboard(idOrSlug);
        return await this.dashboardRepository.deleteDashboard(dashboard.id);
    }
}