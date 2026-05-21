import { IDashboardRepository } from '../../../ports/out/IDashboardRepository.js';

export class PostgresDashboardAdapter extends IDashboardRepository {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async getAllDashboards() {
        const query = `
            SELECT 
                app_page_id as id,
                name,
                slug,
                location_id as "locationId",
                user_id as "userId",
                sort_order as "sortOrder"
            FROM app_page
            ORDER BY sort_order ASC, name ASC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getDashboardBySlug(slug) {
        return this._getDashboard("slug", slug);
    }

    async getDashboardById(id) {
        return this._getDashboard("app_page_id", id);
    }

    async _getDashboard(column, value) {
        const allowedColumns = ['slug', 'app_page_id'];
        if (!allowedColumns.includes(column)) {
            throw new Error(`Invalid search column: ${column}`);
        }
        // Verschachteltes JSON mit allen relevanten Daten aufbauen
        const query = `
            SELECT 
                p.app_page_id as id,
                p.name,
                p.slug,
                p.location_id as "locationId",
                p.user_id as "userId",
                p.sort_order as "sortOrder",
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', t.tile_id,
                            'tileTypeId', t.tile_type_id,
                            'tileTypeName', tt.name,
                            'label', t.label,
                            'colPos', t.col_pos,
                            'rowPos', t.row_pos,
                            'colSpan', t.col_span,
                            'rowSpan', t.row_span,
                            'config', t.config,
                            'datapoints', COALESCE(
                                (SELECT json_agg(
                                    json_build_object(
                                        'id', dp.datapoint_id,
                                        'role', tdp.role,
                                        'name', dp.datapoint_name
                                    )
                                ) FROM tile_datapoint tdp
                                JOIN datapoint dp ON tdp.datapoint_id = dp.datapoint_id
                                WHERE tdp.tile_id = t.tile_id),
                                '[]'::json
                            )
                        ) ORDER BY t.row_pos, t.col_pos
                    ) FROM tile t
                    JOIN tile_type tt ON t.tile_type_id = tt.tile_type_id
                    WHERE t.app_page_id = p.app_page_id),
                    '[]'::json
                ) as tiles
            FROM app_page p
            WHERE ${column} = $1
        `;

        const result = await this.pool.query(query, [value]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    }

    async saveDashboard(dashboardData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            let pageId = dashboardData.id;
            
            // App Page anlegen, falls nur ein Slug (z.B. "main") und keine UUID bekannt ist
            if (!pageId && dashboardData.slug) {
                const pageRes = await client.query('SELECT app_page_id FROM app_page WHERE slug = $1', [dashboardData.slug]);
                if (pageRes.rowCount > 0) {
                    pageId = pageRes.rows[0].app_page_id;
                } else {
                    const newPageRes = await client.query(
                        'INSERT INTO app_page (name, slug, location_id) VALUES ($1, $2, $3) RETURNING app_page_id',
                        [dashboardData.name || 'Dashboard', dashboardData.slug, dashboardData.locationId || null]
                    );
                    pageId = newPageRes.rows[0].app_page_id;
                }
            }

            if (!pageId) throw new Error("Dashboard ID oder Slug zwingend erforderlich.");

            // Metadaten des Dashboards aktualisieren
            const updates = [];
            const params = [];
            if (dashboardData.name) {
                params.push(dashboardData.name);
                updates.push(`name = $${params.length}`);
            }
            if (dashboardData.locationId) {
                params.push(dashboardData.locationId);
                updates.push(`location_id = $${params.length}`);
            }
            if (updates.length > 0) {
                params.push(pageId);
                await client.query(`UPDATE app_page SET ${updates.join(', ')} WHERE app_page_id = $${params.length}`, params);
            }

            const activeTileIds = [];

            for (const tile of dashboardData.tiles || []) {
                let tileId = tile.id;
                let exists = !!tileId;

                let typeId = tile.tileTypeId;
                if (!typeId && tile.tileTypeName) {
                    const typeRes = await client.query('SELECT tile_type_id FROM tile_type WHERE name = $1', [tile.tileTypeName]);
                    if (typeRes.rowCount > 0) typeId = typeRes.rows[0].tile_type_id;
                }
                if (!typeId) throw new Error("Tile Type ID oder Name ist in der Datenbank nicht auffindbar.");

                if (!exists) {
                    const res = await client.query(
                        `INSERT INTO tile (app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING tile_id`,
                        [pageId, typeId, tile.label || '', tile.colPos || 0, tile.rowPos || 0, tile.colSpan || 1, tile.rowSpan || 1, tile.config || null]
                    );
                    tileId = res.rows[0].tile_id;
                } else {
                    const updateRes = await client.query(
                        `UPDATE tile SET tile_type_id = $1, label = $2, col_pos = $3, row_pos = $4, col_span = $5, row_span = $6, config = $7, updated_at = NOW()
                         WHERE tile_id = $8`,
                        [typeId, tile.label || '', tile.colPos || 0, tile.rowPos || 0, tile.colSpan || 1, tile.rowSpan || 1, tile.config || null, tileId]
                    );

                    // Fallback: Falls die ID übergeben wurde, aber in der DB nicht (mehr) existiert
                    if (updateRes.rowCount === 0) {
                        await client.query(
                            `INSERT INTO tile (tile_id, app_page_id, tile_type_id, label, col_pos, row_pos, col_span, row_span, config) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tileId, pageId, typeId, tile.label || '', tile.colPos || 0, tile.rowPos || 0, tile.colSpan || 1, tile.rowSpan || 1, tile.config || null]
                        );
                    }
                }
                
                activeTileIds.push(tileId);

                // Datenpunkte (Verknüpfung Kachel <-> Sensor/Aktor) überschreiben
                if (tile.datapoints) {
                    await client.query('DELETE FROM tile_datapoint WHERE tile_id = $1', [tileId]);
                    for (const dp of tile.datapoints) {
                        await client.query(
                            'INSERT INTO tile_datapoint (tile_id, datapoint_id, role) VALUES ($1, $2, $3)',
                            [tileId, dp.id, dp.role || 'default']
                        );
                    }
                }
            }

            // Orphan-Kacheln und Verknüpfungen bereinigen
            if (activeTileIds.length > 0) {
                await client.query('DELETE FROM tile_datapoint WHERE tile_id IN (SELECT tile_id FROM tile WHERE app_page_id = $1 AND tile_id != ALL($2::uuid[]))', [pageId, activeTileIds]);
                await client.query('DELETE FROM tile WHERE app_page_id = $1 AND tile_id != ALL($2::uuid[])', [pageId, activeTileIds]);
            } else {
                await client.query('DELETE FROM tile_datapoint WHERE tile_id IN (SELECT tile_id FROM tile WHERE app_page_id = $1)', [pageId]);
                await client.query('DELETE FROM tile WHERE app_page_id = $1', [pageId]);
            }

            await client.query('COMMIT');
            return await this.getDashboardById(pageId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteDashboard(id) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            await client.query('DELETE FROM tile_datapoint WHERE tile_id IN (SELECT tile_id FROM tile WHERE app_page_id = $1)', [id]);
            await client.query('DELETE FROM tile WHERE app_page_id = $1', [id]);
            await client.query('DELETE FROM app_page WHERE app_page_id = $1', [id]);
            
            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}