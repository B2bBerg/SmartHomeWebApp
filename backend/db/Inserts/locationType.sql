-- =========================================================================================
-- INITIAL DATA: Location Types (Buildings)
-- =========================================================================================
INSERT INTO location_type (name, location_group_id)
SELECT v.name, g.location_group_id
FROM (VALUES 
    ('Haupthaus'), ('Garage'), ('Einfamilienhaus'), ('Mehrfamilienhaus'), 
    ('Nebengebäude'), ('Gartenhaus'), ('Wohnung'), ('Doppelhaushälfte'), 
    ('Reihenhaus'), ('Villa'), ('Bürogebäude'), ('Lagerhalle'), 
    ('Scheune'), ('Gewächshaus'), ('Carport'), ('Chalet'), 
    ('Ferienhaus'), ('Penthouse')
) AS v(name)
CROSS JOIN (SELECT location_group_id FROM location_group WHERE name = 'building') AS g;

-- =========================================================================================
-- INITIAL DATA: Location Types (Floors)
-- =========================================================================================
INSERT INTO location_type (name, location_group_id)
SELECT v.name, g.location_group_id
FROM (VALUES 
    ('5. UG'), ('5. Untergeschoss'), ('4. UG'), ('4. Untergeschoss'), 
    ('3. UG'), ('3. Untergeschoss'), ('2. UG'), ('2. Untergeschoss'), 
    ('1. UG'), ('1. Untergeschoss'), ('UG'), ('Untergeschoss'), 
    ('EG'), ('Erdgeschoss'), 
    ('OG'), ('Obergeschoss'), ('Dachgeschoss'), 
    ('1. OG'), ('1. Obergeschoss'), ('2. OG'), ('2. Obergeschoss'), 
    ('3. OG'), ('3. Obergeschoss'), ('4. OG'), ('4. Obergeschoss'), 
    ('5. OG'), ('5. Obergeschoss'), ('6. OG'), ('6. Obergeschoss'), 
    ('7. OG'), ('7. Obergeschoss'), ('8. OG'), ('8. Obergeschoss'), 
    ('9. OG'), ('9. Obergeschoss'), ('10. OG'), ('10. Obergeschoss')
) AS v(name)
CROSS JOIN (SELECT location_group_id FROM location_group WHERE name = 'floor') AS g;

-- =========================================================================================
-- INITIAL DATA: Location Types (Appartments)
-- =========================================================================================
INSERT INTO location_type (name, location_group_id)
SELECT v.name, g.location_group_id
FROM (VALUES 
    ('Wohnung'), ('Attikawohnung'), ('Maisonette'), ('Loft'), ('Studio'), 
    ('Penthouse'), ('Einliegerwohnung'), ('Chalet-Wohnung')
) AS v(name)
CROSS JOIN (SELECT location_group_id FROM location_group WHERE name = 'appartment') AS g;

-- =========================================================================================
-- INITIAL DATA: Location Types (Room Counts)
-- =========================================================================================
INSERT INTO location_type (name, location_group_id)
SELECT v.name, g.location_group_id
FROM (VALUES 
    ('1'), ('1.5'), ('2'), ('2.5'), ('3'), ('3.5'), ('4'), ('4.5'), ('5'), ('5.5'), ('6'), ('6.5'), ('7+')
) AS v(name)
CROSS JOIN (SELECT location_group_id FROM location_group WHERE name = 'room_count') AS g;

-- =========================================================================================
-- INITIAL DATA: Location Types (Rooms)
-- =========================================================================================
INSERT INTO location_type (name, location_group_id)
SELECT v.name, g.location_group_id
FROM (VALUES 
    ('Wohnzimmer'), ('Schlafzimmer'), ('Kinderzimmer'), ('Gästezimmer'), 
    ('Küche'), ('Esszimmer'), ('Badezimmer'), ('Gäste-WC'), 
    ('Büro'), ('Flur'), ('Treppenhaus'), ('Keller'), 
    ('Dachboden'), ('Waschküche'), ('Abstellraum'), ('Technikraum'),
    ('Balkon'), ('Terrasse'), ('Wintergarten'), ('Hobbyraum'), 
    ('Speisekammer'), ('Heizungsraum'), ('Serverraum'), ('Ankleidezimmer'), 
    ('Fitnessraum'), ('Sauna'), ('Heimkino'), ('Bibliothek'), 
    ('Werkstatt'), ('Garderobe'), ('Eingangsbereich'), ('Gang'), 
    ('Windfang'), ('Reduit'), ('Loggia'), ('Atelier'), 
    ('Spielzimmer'), ('Hauswirtschaftsraum'), ('Gewerberaum'), 
    ('Lagerraum'), ('Besprechungsraum'), ('Teeküche'), ('Archiv'), 
    ('Praxisraum'), ('Labor'), ('Showroom'), ('Ladenfläche')
) AS v(name)
CROSS JOIN (SELECT location_group_id FROM location_group WHERE name = 'room') AS g;