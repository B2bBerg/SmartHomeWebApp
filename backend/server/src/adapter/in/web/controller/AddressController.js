export class AddressController {
    constructor(addressService) {
        this.addressService = addressService;
    }

    async getAddresses(req, res) {
        try {
            res.json(await this.addressService.getAddresses());
        } catch (error) {
            res.status(500).json({ message: "Fehler beim Abrufen der Adressen", error: error.message });
        }
    }

    async getAddressById(req, res) {
        try {
            const address = await this.addressService.getAddressById(req.params.id);
            if (!address) return res.status(404).json({ message: "Adresse nicht gefunden" });
            res.json(address);
        } catch (error) {
            res.status(500).json({ message: "Fehler", error: error.message });
        }
    }

    async searchAddresses(req, res) {
        try {
            res.json(await this.addressService.searchAddresses(req.query.q || ''));
        } catch (error) {
            res.status(500).json({ message: "Fehler bei der Adresssuche", error: error.message });
        }
    }

    async addAddress(req, res) {
        try {
            res.status(201).json(await this.addressService.addAddress(req.body));
        } catch (error) {
            res.status(500).json({ message: "Fehler", error: error.message });
        }
    }

    async updateAddress(req, res) {
        try {
            res.json(await this.addressService.updateAddress(req.params.id, req.body));
        } catch (error) {
            res.status(error.status || 500).json({ message: "Fehler", error: error.message });
        }
    }

    async deleteAddress(req, res) {
        try {
            res.json(await this.addressService.deleteAddress(req.params.id));
        } catch (error) {
            res.status(error.status || 500).json({ message: "Fehler", error: error.message });
        }
    }
}