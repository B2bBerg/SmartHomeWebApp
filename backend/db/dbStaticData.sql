-- Database schema for SmartHomeWebApp with postgreSQL for static data like device types, room types, etc.

-- Table for user
-- /////////////////////////////////////////////////////////
create table if not exists users (
    user_id UUID PRIMARY KEY DEFAULT uuidv7()
);

-- Table for basic types
-- /////////////////////////////////////////////////////////

-- Tables for devices, sensors and actuators
-- /////////////////////////////////////////////////////////


-- Table for Website tile content
-- /////////////////////////////////////////////////////////
    -- Tile Type
    create table if not exists tile_type (
        tile_type_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        tile_type_name text not null,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );


-- Tile where using on website like locations or dashboard
create table if not exists tile (
    tile_id UUID PRIMARY KEY DEFAULT uuidv7(),
    tile_label varchar(255) not null,
    tile_type_id int not null,
    side varchar(255) not null,
    col smallint not null,
    row smallint not null,
    col_span smallint not null,
    row_span smallint not null,
    datapoint_id UUID not null,
    foreign key (tile_type_id) references tile_type(tile_type_id),
    foreign key (datapoint_id) references datapoint(datapoint_id)
);

-- Table for Sensors and actuators
create table if not exists datapoint (
    datapoint_id UUID PRIMARY KEY DEFAULT uuidv7(),
    datapoint_name varchar(255) not null,
    device_id UUID,
    actuator boolean not null,
    sensor boolean not null,
    datapoint_type varchar(255) not null,
    on_channel varchar(255) not null,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    foreign key (device_id) references devices (device_id),
    location_filter_id int not null,
    foreign key (location_filter_id) references location_filter(location_filter_id)
);




-- Prozeduren
-- /////////////////////////////////////////////////////////
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Diesen Trigger musst du an jede Tabelle hängen:
CREATE TRIGGER update_user_modtime BEFORE UPDATE ON devices 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();