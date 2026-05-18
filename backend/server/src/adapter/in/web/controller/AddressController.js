export class AddressController {
    constructor(addressService) {
        this.addressService = addressService;
    }

    async getAddresses(req, res) {
        res.json(await this.addressService.getAddresses());
    }

    async getAddressById(req, res) {
        const address = await this.addressService.getAddressById(req.params.id);
        if (!address) return res.status(404).json({ message: "Adresse nicht gefunden" });
        res.json(address);
    }

    async searchAddresses(req, res) {
        res.json(await this.addressService.searchAddresses(req.query.q || ''));
    }

    async addAddress(req, res) {
        const newAddress = await this.addressService.addAddress(req.body);
        res.status(201).json(newAddress);
    }

    async updateAddress(req, res) {
        res.json(await this.addressService.updateAddress(req.params.id, req.body));
    }

    async deleteAddress(req, res) {
        res.json(await this.addressService.deleteAddress(req.params.id));
    }
}