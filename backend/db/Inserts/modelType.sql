-- =========================================================================================
-- INITIAL DATA: Model Types (Devices)
-- =========================================================================================
INSERT INTO model_type (model_name, manufacturer_id)
SELECT v.model_name, m.manufacturer_id
FROM (VALUES 
    ('Hue White', 'Philips Hue'), 
    ('Hue Color Ambiance', 'Philips Hue'), 
    ('Shelly 1', 'Shelly'), 
    ('Shelly 2.5', 'Shelly'), 
    ('Shelly Plus 1PM', 'Shelly'), 
    ('Smart Radiator Thermostat', 'Bosch Smart Home'), 
    ('Door/Window Contact', 'Bosch Smart Home'), 
    ('Miniserver', 'Loxone'), 
    ('Motion Sensor', 'Fibaro'), 
    ('Smart AC Control', 'tado°'), 
    ('Weather Station', 'Netatmo'), 
    ('TRÅDFRI Gateway', 'IKEA TRÅDFRI'), 
    ('Smart Lock 3.0', 'Nuki'), 
    ('Video Doorbell Pro', 'Ring')
) AS v(model_name, manufacturer_name)
JOIN manufacturer m ON m.manufacturer_name = v.manufacturer_name;