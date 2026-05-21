export class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }

    async getDashboard(req, res) {
        const dashboard = await this.dashboardService.getDashboard(req.params.id);
        res.json(dashboard);
    }

    async saveDashboard(req, res) {
        const dashboard = await this.dashboardService.saveDashboard(req.params.id, req.body);
        res.json(dashboard);
    }
}