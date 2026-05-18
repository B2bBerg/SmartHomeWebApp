import { IAddressService } from '../../ports/in/IAddressService.js';
import { Address } from '../domain/Address.js';

export class AddressService extends IAddressService {
    constructor(addressRepository) {
        super();
        this.addressRepository = addressRepository;
    }

    async getAddresses() { return await this.addressRepository.getAddresses(); }
    async getAddressById(id) { return await this.addressRepository.getAddressById(id); }
    async searchAddresses(query) { return await this.addressRepository.searchAddresses(query); }
    
    async addAddress(addressData) { 
        const address = new Address(addressData);
        address.validate(); // Prüft die Geschäftsregeln und wirft bei Fehlern eine Exception
        return await this.addressRepository.addAddress(address); 
    }
    
    async updateAddress(id, addressData) { 
        const address = new Address({ ...addressData, id });
        address.validate();
        return await this.addressRepository.updateAddress(id, address); 
    }
    async deleteAddress(id) { return await this.addressRepository.deleteAddress(id); }
}