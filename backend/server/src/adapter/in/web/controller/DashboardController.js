export class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }

    async getAllDashboards(req, res) {
        const dashboards = await this.dashboardService.getAllDashboards();
        res.json(dashboards);
    }

    async getDashboard(req, res) {
        const dashboard = await this.dashboardService.getDashboard(req.params.id);
        res.json(dashboard);
    }

    async saveDashboard(req, res) {
        const dashboard = await this.dashboardService.saveDashboard(req.params.id, req.body);
        res.json(dashboard);
    }

    async deleteDashboard(req, res) {
        await this.dashboardService.deleteDashboard(req.params.id);
        res.status(204).send();
    }
}