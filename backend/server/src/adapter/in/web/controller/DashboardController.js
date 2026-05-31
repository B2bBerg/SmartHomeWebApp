export class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }

    async getTileTypes(req, res) {
        const types = await this.dashboardService.getTileTypes();
        res.json(types);
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

    async getDashboardTiles(req, res) {
        try {
            console.log(`[DashboardController] Request for tiles, slug: ${req.params.id}`);
            const tiles = await this.dashboardService.getDashboardTiles(req.params.id);
            console.log(`[DashboardController] Returning tiles:`, tiles);
            res.json(tiles || []);
        } catch (err) {
            console.error(`[DashboardController] Error fetching tiles:`, err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async saveDashboardTiles(req, res) {
        const tiles = await this.dashboardService.saveDashboardTiles(req.params.id, req.body);
        res.json(tiles);
    }
}