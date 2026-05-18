import { IAddressRepository } from '../../../ports/out/IAddressRepository.js';

export class PostgresAddressAdapter extends IAddressRepository {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async getAddresses() {
        const result = await this.pool.query('SELECT id, street, number, zip, city, country FROM addresses WHERE deleted_at IS NULL');
        return result.rows;
    }

    async getAddressById(id) {
        const result = await this.pool.query('SELECT id, street, number, zip, city, country FROM addresses WHERE id = $1 AND deleted_at IS NULL', [id]);
        return result.rows[0] || null;
    }

    async searchAddresses(query) {
        const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        if (searchTerms.length === 0) return [];
        
        let sql = 'SELECT id, street, number, zip, city, country FROM addresses WHERE deleted_at IS NULL';
        const params = [];
        
        searchTerms.forEach((term, idx) => {
            params.push(`%${term}%`);
            sql += ` AND concat_ws(' ', street, number, zip, city, country) ILIKE $${idx + 1}`;
        });

        const result = await this.pool.query(sql, params);
        
        // Exakt das Format zurückgeben, welches das Frontend in der "Omni-Search" erwartet
        return result.rows.map(row => {
            const addrStr = `${row.street || ''} ${row.number || ''} ${row.zip || ''} ${row.city || ''}`.trim();
            return { str: addrStr, obj: row };
        });
    }

    async addAddress(addressData) {
        const res = await this.pool.query(
            'INSERT INTO addresses (street, number, zip, city, country) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [addressData.street, addressData.number, addressData.zip, addressData.city, addressData.country]
        );
        return { success: true, id: res.rows[0].id };
    }

    async updateAddress(id, addressData) {
        const result = await this.pool.query(
            'UPDATE addresses SET street = $1, number = $2, zip = $3, city = $4, country = $5 WHERE id = $6 AND deleted_at IS NULL',
            [addressData.street, addressData.number, addressData.zip, addressData.city, addressData.country, id]
        );
        if (result.rowCount === 0) throw { status: 404, message: "Address not found" };
        return { success: true };
    }

    async deleteAddress(id) {
        const result = await this.pool.query('UPDATE addresses SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (result.rowCount === 0) throw { status: 404, message: "Address not found" };
        return { success: true };
    }
}