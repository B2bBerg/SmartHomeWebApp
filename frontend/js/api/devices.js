import { fetchApi } from './core.js';

export const DevicesAPI = {
    getBusTypes: async () => {
        return await fetchApi('/devices/bus-types');
    },

    getModelTypes: async () => {
        return await fetchApi('/devices/models');
    },

    getDevices: async (busType = null) => {
        const query = busType ? `?bus=${encodeURIComponent(busType)}` : '';
        return await fetchApi('/devices' + query);
    },
    
    scanNetwork: async (busType) => {
        return await fetchApi(`/devices/scan-network?bus=${encodeURIComponent(busType)}`);
    },

    scanDevice: async (address, busType) => {
        return await fetchApi(`/devices/scan?address=${encodeURIComponent(address)}&bus=${encodeURIComponent(busType)}`);
    },
    
    scanDevicesBulk: async (devicesToScan) => {
        // devicesToScan ist ein Array von { address, busType }
        return await fetchApi(`/devices/scan-bulk`, { method: 'POST', body: JSON.stringify(devicesToScan) });
    },

    addDevice: async (deviceData) => {
        return await fetchApi('/devices', { method: 'POST', body: JSON.stringify(deviceData) });
    },
    
    updateDevice: async (id, updateData) => {
        return await fetchApi(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
    },
    
    deleteDevice: async (id) => {
        return await fetchApi(`/devices/${id}`, { method: 'DELETE' });
    }
};