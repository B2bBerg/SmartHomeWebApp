import { IAddressService } from '../../ports/in/IAddressService.js';

export class AddressService extends IAddressService {
    constructor(addressRepository) {
        super();
        this.addressRepository = addressRepository;
    }

    async getAddresses() { return await this.addressRepository.getAddresses(); }
    async getAddressById(id) { return await this.addressRepository.getAddressById(id); }
    async searchAddresses(query) { return await this.addressRepository.searchAddresses(query); }
    async addAddress(addressData) { return await this.addressRepository.addAddress(addressData); }
    async updateAddress(id, addressData) { return await this.addressRepository.updateAddress(id, addressData); }
    async deleteAddress(id) { return await this.addressRepository.deleteAddress(id); }
}