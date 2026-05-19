import { IAddressRepository } from '../../../ports/out/IAddressRepository.js';

export class PostgresAddressAdapter extends IAddressRepository {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async getAddresses() {
        const result = await this.pool.query('SELECT address_id as id, street, street_number, zip_code, city, state, country FROM address WHERE is_active = true');
        return result.rows;
    }

    async getAddressById(id) {
        const result = await this.pool.query('SELECT address_id as id, street, street_number, zip_code, city, state, country FROM address WHERE address_id = $1 AND is_active = true', [id]);
        return result.rows[0] || null;
    }

    async searchAddresses(query) {
        const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        if (searchTerms.length === 0) return [];
        
        let sql = 'SELECT address_id as id, street, street_number, zip_code, city, state, country FROM address WHERE is_active = true';
        const params = [];
        
        searchTerms.forEach((term, idx) => {
            params.push(`%${term}%`);
            sql += ` AND concat_ws(' ', street, street_number, zip_code, city, state, country) ILIKE $${idx + 1}`;
        });

        const result = await this.pool.query(sql, params);
        
        // Exakt das Format zurückgeben, welches das Frontend in der "Omni-Search" erwartet
        return result.rows.map(row => {
            const addrStr = `${row.street || ''} ${row.street_number || ''} ${row.zip_code || ''} ${row.city || ''}`.trim();
            return { str: addrStr, obj: row };
        });
    }

    async addAddress(addressData) {
        const res = await this.pool.query(
            'INSERT INTO address (street, street_number, zip_code, city, state, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING address_id as id',
            [addressData.street, addressData.street_number, addressData.zip_code, addressData.city, addressData.state, addressData.country]
        );
        return { success: true, id: res.rows[0].id };
    }

    async updateAddress(id, addressData) {
        const result = await this.pool.query(
            'UPDATE address SET street = $1, street_number = $2, zip_code = $3, city = $4, state = $5, country = $6, updated_at = NOW() WHERE address_id = $7 AND is_active = true',
            [addressData.street, addressData.street_number, addressData.zip_code, addressData.city, addressData.state, addressData.country, id]
        );
        if (result.rowCount === 0) throw { status: 404, message: "Address not found" };
        return { success: true };
    }

    async deactivateAddress(id) {
        const result = await this.pool.query('UPDATE address SET is_active = false, deactivated_at = NOW() WHERE address_id = $1 AND is_active = true', [id]);
        if (result.rowCount === 0) throw { status: 404, message: "Address not found" };
        return { success: true };
    }
}