import { IDashboardService } from '../../ports/in/IDashboardService.js';
import { Dashboard } from '../domain/Dashboard.js';

export class DashboardService extends IDashboardService {
    constructor(dashboardRepository) {
        super();
        this.dashboardRepository = dashboardRepository;
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
        dashboard.validate();
        return await this.dashboardRepository.saveDashboard(dashboard);
    }
}