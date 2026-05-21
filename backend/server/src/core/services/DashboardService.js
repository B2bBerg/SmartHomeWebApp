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
        
        // Auto-Link Location: Falls das Dashboard zu einem Raum gehört (slug: dashboard_room_<uuid>)
        if (idOrSlug && idOrSlug.startsWith('dashboard_room_')) {
            const potentialLocationId = idOrSlug.replace('dashboard_room_', '');
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialLocationId);
            if (isUuid) {
                dashboard.locationId = potentialLocationId;
                if (!dashboardData.name || dashboardData.name === 'Dashboard') dashboard.name = 'Raum-Dashboard';
            }
        }

        dashboard.validate();
        return await this.dashboardRepository.saveDashboard(dashboard);
    }

    async deleteDashboard(idOrSlug) {
        const dashboard = await this.getDashboard(idOrSlug);
        return await this.dashboardRepository.deleteDashboard(dashboard.id);
    }
}