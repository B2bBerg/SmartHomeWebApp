-- =========================================================================================
-- INITIAL DATA: Locations (Buildings, Floors, Rooms)
-- =========================================================================================

DO $$
DECLARE
    v_addr_id uuid;
    v_grp_building uuid; v_grp_floor uuid; v_grp_room uuid;
    v_typ_haus uuid; v_typ_etage uuid; v_typ_zimmer uuid;
    v_haus_id uuid;
    v_eg_id uuid; v_og_id uuid;
    v_wohn_id uuid; v_kueche_id uuid; v_technik_id uuid;
    v_schlaf_id uuid; v_bad_id uuid; v_buero_id uuid;
BEGIN
    -- 1. Adresse anlegen
    SELECT address_id INTO v_addr_id FROM address WHERE street = 'Musterstrasse' LIMIT 1;
    IF v_addr_id IS NULL THEN
        INSERT INTO address (street, street_number, city, zip_code, country) 
        VALUES ('Musterstrasse', '1', 'Aarau', '5000', 'Schweiz') RETURNING address_id INTO v_addr_id;
    END IF;

    -- 2. Location Groups (Strukturelle Verhaltensgruppen)
    SELECT location_group_id INTO v_grp_building FROM location_group WHERE name = 'building' LIMIT 1;
    IF v_grp_building IS NULL THEN INSERT INTO location_group (name) VALUES ('building') RETURNING location_group_id INTO v_grp_building; END IF;
    
    SELECT location_group_id INTO v_grp_floor FROM location_group WHERE name = 'floor' LIMIT 1;
    IF v_grp_floor IS NULL THEN INSERT INTO location_group (name) VALUES ('floor') RETURNING location_group_id INTO v_grp_floor; END IF;
    
    SELECT location_group_id INTO v_grp_room FROM location_group WHERE name = 'room' LIMIT 1;
    IF v_grp_room IS NULL THEN INSERT INTO location_group (name) VALUES ('room') RETURNING location_group_id INTO v_grp_room; END IF;

    -- 3. Location Types (Benennbare Typen für das GUI)
    SELECT location_type_id INTO v_typ_haus FROM location_type WHERE name = 'Haus' LIMIT 1;
    IF v_typ_haus IS NULL THEN INSERT INTO location_type (name, location_group_id) VALUES ('Haus', v_grp_building) RETURNING location_type_id INTO v_typ_haus; END IF;
    
    SELECT location_type_id INTO v_typ_etage FROM location_type WHERE name = 'Etage' LIMIT 1;
    IF v_typ_etage IS NULL THEN INSERT INTO location_type (name, location_group_id) VALUES ('Etage', v_grp_floor) RETURNING location_type_id INTO v_typ_etage; END IF;
    
    SELECT location_type_id INTO v_typ_zimmer FROM location_type WHERE name = 'Zimmer' LIMIT 1;
    IF v_typ_zimmer IS NULL THEN INSERT INTO location_type (name, location_group_id) VALUES ('Zimmer', v_grp_room) RETURNING location_type_id INTO v_typ_zimmer; END IF;

    -- 4. Gebäudeinfrastruktur aufbauen (Haus > Stockwerke > Räume)
    -- Haus
    SELECT location_id INTO v_haus_id FROM location WHERE location_name = 'Einfamilienhaus' LIMIT 1;
    IF v_haus_id IS NULL THEN INSERT INTO location (location_name, location_type_id, address_id) VALUES ('Einfamilienhaus', v_typ_haus, v_addr_id) RETURNING location_id INTO v_haus_id; END IF;
    
    -- Stockwerke (EG, OG)
    SELECT location_id INTO v_eg_id FROM location WHERE location_name = 'Erdgeschoss' AND parent_location_id = v_haus_id LIMIT 1;
    IF v_eg_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Erdgeschoss', v_typ_etage, v_haus_id) RETURNING location_id INTO v_eg_id; END IF;
    
    SELECT location_id INTO v_og_id FROM location WHERE location_name = 'Obergeschoss' AND parent_location_id = v_haus_id LIMIT 1;
    IF v_og_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Obergeschoss', v_typ_etage, v_haus_id) RETURNING location_id INTO v_og_id; END IF;

    -- Räume EG
    SELECT location_id INTO v_wohn_id FROM location WHERE location_name = 'Wohnzimmer' AND parent_location_id = v_eg_id LIMIT 1;
    IF v_wohn_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Wohnzimmer', v_typ_zimmer, v_eg_id) RETURNING location_id INTO v_wohn_id; END IF;
    SELECT location_id INTO v_kueche_id FROM location WHERE location_name = 'Küche' AND parent_location_id = v_eg_id LIMIT 1;
    IF v_kueche_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Küche', v_typ_zimmer, v_eg_id) RETURNING location_id INTO v_kueche_id; END IF;
    SELECT location_id INTO v_technik_id FROM location WHERE location_name = 'Technikraum' AND parent_location_id = v_eg_id LIMIT 1;
    IF v_technik_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Technikraum', v_typ_zimmer, v_eg_id) RETURNING location_id INTO v_technik_id; END IF;

    -- Räume OG
    SELECT location_id INTO v_schlaf_id FROM location WHERE location_name = 'Schlafzimmer' AND parent_location_id = v_og_id LIMIT 1;
    IF v_schlaf_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Schlafzimmer', v_typ_zimmer, v_og_id) RETURNING location_id INTO v_schlaf_id; END IF;
    SELECT location_id INTO v_bad_id FROM location WHERE location_name = 'Badezimmer' AND parent_location_id = v_og_id LIMIT 1;
    IF v_bad_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Badezimmer', v_typ_zimmer, v_og_id) RETURNING location_id INTO v_bad_id; END IF;
    SELECT location_id INTO v_buero_id FROM location WHERE location_name = 'Büro' AND parent_location_id = v_og_id LIMIT 1;
    IF v_buero_id IS NULL THEN INSERT INTO location (location_name, location_type_id, parent_location_id) VALUES ('Büro', v_typ_zimmer, v_og_id) RETURNING location_id INTO v_buero_id; END IF;

    RAISE NOTICE 'Location-Hierarchie erfolgreich eingefügt.';
END $$;