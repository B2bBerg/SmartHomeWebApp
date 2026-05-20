
CREATE TABLE address
(
  address_id     uuid         NOT NULL DEFAULT uuidv7(),
  street         varchar(255),
  street_number  varchar(20) ,
  city           varchar(255),
  state          varchar(255),
  zip_code       varchar(20) ,
  country        varchar(255),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  DEFAULT now(),
  is_active      boolean      DEFAULT true,
  deactivated_at timestamptz ,
  PRIMARY KEY (address_id)
);

CREATE TABLE app_page
(
  app_page_id uuid         NOT NULL DEFAULT uuidv7(),
  name        varchar(100) NOT NULL,
  slug        varchar(100) UNIQUE,
  location_id uuid        ,
  user_id     uuid        ,
  sort_order  int          DEFAULT 0,
  created_at  timestamptz  DEFAULT now(),
  PRIMARY KEY (app_page_id)
);

COMMENT ON COLUMN app_page.name IS 'z.B. "Dashboard", "Location Overview", "Energy"';

COMMENT ON COLUMN app_page.slug IS 'z.B. "main-dashboard" für die URL';

CREATE TABLE audit_log
(
  log_id     uuid        NOT NULL DEFAULT uuidv7(),
  user_id    uuid        NOT NULL,
  action     text        NOT NULL,
  target_id  uuid       ,
  details    jsonb      ,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Protokollierung von Aktionen (Audit Trail)';

COMMENT ON COLUMN audit_log.target_id IS 'ID des betroffenen Objekts (Device, User, etc.)';

COMMENT ON COLUMN audit_log.details IS 'Alter Wert, neuer Wert';

CREATE TABLE automation_rule
(
  rule_id        uuid         NOT NULL DEFAULT uuidv7(),
  name           varchar(255) NOT NULL,
  description    text        ,
  location_id    uuid        ,
  created_by     uuid         NOT NULL,
  created_at     timestamptz  DEFAULT now(),
  updated_at     timestamptz  DEFAULT now(),
  is_active      boolean      DEFAULT true,
  deactivated_at timestamptz ,
  PRIMARY KEY (rule_id)
);

CREATE TABLE bus_type
(
  bus_type_id uuid        NOT NULL DEFAULT uuidv7(),
  bus_name    text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bus_type_id)
);

CREATE TABLE channel_type
(
  channel_id   uuid        NOT NULL DEFAULT uuidv7(),
  channel_name varchar(10) NOT NULL,
  description  text       ,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id)
);

COMMENT ON TABLE channel_type IS 'Like "DI_01, DO_01, AI_01, AO_01"';

CREATE TABLE datapoint
(
  datapoint_id      uuid         NOT NULL DEFAULT uuidv7(),
  datapoint_name    varchar(255),
  device_channel_id uuid         NOT NULL,
  datapoint_type_id uuid         NOT NULL,
  unit_type_id      uuid         NOT NULL,
  is_actuator       boolean      DEFAULT false,
  is_sensor         boolean      DEFAULT false,
  created_at        timestamptz  DEFAULT now(),
  updated_at        timestamptz  DEFAULT now(),
  is_active         boolean      DEFAULT true,
  deactivated_at    timestamptz ,
  obis_code         varchar(32) ,
  scaler            numeric      DEFAULT 1,
  PRIMARY KEY (datapoint_id)
);

COMMENT ON COLUMN datapoint.datapoint_type_id IS 'ist Wert';

COMMENT ON COLUMN datapoint.unit_type_id IS 'ist Wert';

COMMENT ON COLUMN datapoint.obis_code IS 'z.B. "1-0:1.8.0"';

COMMENT ON COLUMN datapoint.scaler IS 'z.B. Wh in kWh umzurechnen';

CREATE TABLE datapoint_type
(
  datapoint_type_id uuid         NOT NULL DEFAULT uuidv7(),
  datapoint_type    varchar(255) NOT NULL,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (datapoint_type_id)
);

COMMENT ON COLUMN datapoint_type.datapoint_type IS '"Lux", "Temperature", "Switch"';

CREATE TABLE device_channel
(
  device_channel_id uuid        NOT NULL DEFAULT uuidv7(),
  device_id         uuid        NOT NULL,
  channel_id        uuid        NOT NULL,
  channel_number    smallint   ,
  is_inverted       boolean     DEFAULT false,
  description       text       ,
  can_switch        boolean    ,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_channel_id)
);

COMMENT ON COLUMN device_channel.can_switch IS 'Switch between Input and Output';

CREATE TABLE devices
(
  device_id      uuid         NOT NULL DEFAULT uuidv7(),
  device_name    varchar(255) NOT NULL,
  model_type_id  uuid         NOT NULL,
  serial_number  varchar(255) NOT NULL,
  bus_type_id    uuid         NOT NULL,
  location_id    uuid         NOT NULL,
  mac_address    macaddr      UNIQUE,
  bus_address    smallint    ,
  battery_level  smallint    ,
  signal_level   smallint    ,
  status         varchar(50) ,
  last_seen      timestamptz  DEFAULT now(),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  DEFAULT now(),
  metadata       jsonb       ,
  is_active      boolean      DEFAULT true,
  deactivated_at timestamptz ,
  PRIMARY KEY (device_id)
);

CREATE TABLE location
(
  parent_location_id uuid       ,
  location_id        uuid        NOT NULL DEFAULT uuidv7(),
  location_name      text        NOT NULL,
  location_type_id   uuid        NOT NULL,
  address_id         uuid       ,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  metadata           jsonb      ,
  is_active          boolean     DEFAULT true,
  deactivated_at     timestamptz,
  PRIMARY KEY (location_id)
);

CREATE TABLE location_group
(
  location_group_id uuid NOT NULL DEFAULT uuidv7(),
  name              text NOT NULL,
  PRIMARY KEY (location_group_id)
);

COMMENT ON TABLE location_group IS 'Building, Floor, Appartment, Room, Room_Count';

COMMENT ON COLUMN location_group.name IS 'Building, Floor, Appartment, Room, Room_Count';

CREATE TABLE location_type
(
  location_type_id  uuid NOT NULL DEFAULT uuidv7(),
  name              text NOT NULL,
  location_group_id uuid NOT NULL,
  PRIMARY KEY (location_type_id)
);

COMMENT ON COLUMN location_type.name IS 'EG, OG, 4-Z, 3-Z, Haupthaus, Garage, Wohnzimmer, Schlafzimmer';

CREATE TABLE manufacturer
(
  manufacturer_id   uuid         NOT NULL DEFAULT uuidv7(),
  manufacturer_name varchar(255) NOT NULL,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (manufacturer_id)
);

CREATE TABLE model_type
(
  model_type_id   uuid        NOT NULL DEFAULT uuidv7(),
  manufacturer_id uuid        NOT NULL,
  model_name      text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (model_type_id)
);

CREATE TABLE obis_definition
(
  obis_code       varchar(32)  NOT NULL,
  name            varchar(100) NOT NULL,
  description     text        ,
  medium          varchar(50) ,
  default_type_id uuid         NOT NULL,
  default_unit_id uuid         NOT NULL,
  PRIMARY KEY (obis_code)
);

COMMENT ON COLUMN obis_definition.obis_code IS 'z.B. "1-0:1.8.0"';

COMMENT ON COLUMN obis_definition.name IS 'Wirkenergie Bezug';

COMMENT ON COLUMN obis_definition.medium IS '"Strom", "Gas", "Wasser"';

COMMENT ON COLUMN obis_definition.default_type_id IS 'soll Wert';

COMMENT ON COLUMN obis_definition.default_unit_id IS 'soll Wert';

CREATE TABLE permission_type
(
  permission_type_id uuid        NOT NULL DEFAULT uuidv7(),
  name               varchar(50) NOT NULL UNIQUE,
  description        text       ,
  PRIMARY KEY (permission_type_id)
);

COMMENT ON TABLE permission_type IS 'Berechtigungsstufen';

CREATE TABLE rule_action
(
  action_id     uuid    NOT NULL DEFAULT uuidv7(),
  rule_id       uuid    NOT NULL,
  datapoint_id  uuid    NOT NULL,
  target_value  numeric NOT NULL,
  delay_seconds int     DEFAULT 0,
  PRIMARY KEY (action_id)
);

COMMENT ON COLUMN rule_action.datapoint_id IS 'Aktor';

CREATE TABLE rule_condition
(
  condition_id     uuid        NOT NULL DEFAULT uuidv7(),
  rule_id          uuid        NOT NULL,
  datapoint_id     uuid        NOT NULL,
  operator         varchar(10) NOT NULL,
  comparison_value numeric     NOT NULL,
  logic_operator   varchar(10) DEFAULT 'AND',
  sort_order       int         DEFAULT 0,
  PRIMARY KEY (condition_id)
);

COMMENT ON COLUMN rule_condition.datapoint_id IS 'Sensor';

COMMENT ON COLUMN rule_condition.comparison_value IS 'Grenzwert';

COMMENT ON COLUMN rule_condition.logic_operator IS 'mehrere Bedingungen "AND" oder "OR"';

CREATE TABLE tile
(
  tile_id      uuid         NOT NULL DEFAULT uuidv7(),
  app_page_id  uuid         NOT NULL,
  tile_type_id uuid         NOT NULL,
  label        varchar(255),
  col_pos      smallint     NOT NULL,
  row_pos      smallint     NOT NULL,
  col_span     smallint    ,
  row_span     smallint    ,
  config       jsonb       ,
  created_at   timestamptz  DEFAULT now(),
  updated_at   timestamptz  DEFAULT now(),
  PRIMARY KEY (tile_id)
);

CREATE TABLE tile_datapoint
(
  datapoint_id uuid        NOT NULL,
  tile_id      uuid        NOT NULL,
  role         varchar(50),
  PRIMARY KEY (datapoint_id, tile_id)
);

COMMENT ON COLUMN tile_datapoint.role IS 'z.B. "up", "down", "position"';

CREATE TABLE tile_type
(
  tile_type_id     uuid        NOT NULL DEFAULT uuidv7(),
  name             varchar(50) NOT NULL,
  description      text       ,
  default_col_span smallint   ,
  default_row_span smallint   ,
  created_at       timestamptz DEFAULT now(),
  PRIMARY KEY (tile_type_id)
);

CREATE TABLE unit_type
(
  unit_type_id uuid        NOT NULL DEFAULT uuidv7(),
  unit_type    varchar(50) NOT NULL,
  PRIMARY KEY (unit_type_id)
);

COMMENT ON COLUMN unit_type.unit_type IS '"°C", "%", "lux"';

CREATE TABLE user_invitations
(
  invitation_id uuid         NOT NULL DEFAULT uuidv7(),
  user_id       uuid         NOT NULL,
  email         varchar(255) NOT NULL UNIQUE,
  token         text         NOT NULL UNIQUE,
  expires_at    timestamptz  NOT NULL,
  accepted_at   timestamptz ,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  DEFAULT now(),
  PRIMARY KEY (invitation_id)
);

COMMENT ON COLUMN user_invitations.user_id IS 'invited_by';

CREATE TABLE user_location_access
(
  access_id          uuid NOT NULL DEFAULT uuidv7(),
  user_id            uuid NOT NULL,
  permission_type_id uuid NOT NULL,
  location_id        uuid NOT NULL,
  PRIMARY KEY (access_id)
);

CREATE TABLE user_sessions
(
  session_id uuid        NOT NULL DEFAULT uuidv7(),
  user_id    uuid        NOT NULL,
  token_hash text        NOT NULL,
  ip_address inet       ,
  user_agent text       ,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id)
);

COMMENT ON TABLE user_sessions IS 'Tracking aktiver Logins';

CREATE TABLE users
(
  user_id        uuid         NOT NULL DEFAULT uuidv7(),
  username       varchar(255) NOT NULL UNIQUE,
  email          varchar(255) NOT NULL UNIQUE,
  password_hash  text         NOT NULL,
  prename        varchar(255) NOT NULL,
  middle_name    varchar(255),
  surname        varchar(255) NOT NULL,
  address_id     uuid        ,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  DEFAULT now(),
  last_login     timestamptz ,
  is_active      boolean      DEFAULT true,
  deactivated_at timestamptz ,
  PRIMARY KEY (user_id)
);

ALTER TABLE location
  ADD CONSTRAINT FK_location_type_TO_location
    FOREIGN KEY (location_type_id)
    REFERENCES location_type (location_type_id);

ALTER TABLE location
  ADD CONSTRAINT FK_location_TO_location
    FOREIGN KEY (parent_location_id)
    REFERENCES location (location_id);

ALTER TABLE location
  ADD CONSTRAINT FK_address_TO_location
    FOREIGN KEY (address_id)
    REFERENCES address (address_id);

ALTER TABLE location_type
  ADD CONSTRAINT FK_location_group_TO_location_type
    FOREIGN KEY (location_group_id)
    REFERENCES location_group (location_group_id);

ALTER TABLE model_type
  ADD CONSTRAINT FK_manufacturer_TO_model_type
    FOREIGN KEY (manufacturer_id)
    REFERENCES manufacturer (manufacturer_id);

ALTER TABLE devices
  ADD CONSTRAINT FK_bus_type_TO_devices
    FOREIGN KEY (bus_type_id)
    REFERENCES bus_type (bus_type_id);

ALTER TABLE devices
  ADD CONSTRAINT FK_location_TO_devices
    FOREIGN KEY (location_id)
    REFERENCES location (location_id);

ALTER TABLE device_channel
  ADD CONSTRAINT FK_devices_TO_device_channel
    FOREIGN KEY (device_id)
    REFERENCES devices (device_id);

ALTER TABLE device_channel
  ADD CONSTRAINT FK_channel_type_TO_device_channel
    FOREIGN KEY (channel_id)
    REFERENCES channel_type (channel_id);

ALTER TABLE devices
  ADD CONSTRAINT FK_model_type_TO_devices
    FOREIGN KEY (model_type_id)
    REFERENCES model_type (model_type_id);

ALTER TABLE users
  ADD CONSTRAINT FK_address_TO_users
    FOREIGN KEY (address_id)
    REFERENCES address (address_id);

ALTER TABLE user_location_access
  ADD CONSTRAINT FK_users_TO_user_location_access
    FOREIGN KEY (user_id)
    REFERENCES users (user_id);

ALTER TABLE user_location_access
  ADD CONSTRAINT FK_permission_type_TO_user_location_access
    FOREIGN KEY (permission_type_id)
    REFERENCES permission_type (permission_type_id);

ALTER TABLE user_location_access
  ADD CONSTRAINT FK_location_TO_user_location_access
    FOREIGN KEY (location_id)
    REFERENCES location (location_id);

ALTER TABLE user_sessions
  ADD CONSTRAINT FK_users_TO_user_sessions
    FOREIGN KEY (user_id)
    REFERENCES users (user_id);

ALTER TABLE audit_log
  ADD CONSTRAINT FK_users_TO_audit_log
    FOREIGN KEY (user_id)
    REFERENCES users (user_id);

ALTER TABLE user_invitations
  ADD CONSTRAINT FK_users_TO_user_invitations
    FOREIGN KEY (user_id)
    REFERENCES users (user_id);

ALTER TABLE datapoint
  ADD CONSTRAINT FK_device_channel_TO_datapoint
    FOREIGN KEY (device_channel_id)
    REFERENCES device_channel (device_channel_id);

ALTER TABLE datapoint
  ADD CONSTRAINT FK_datapoint_type_TO_datapoint
    FOREIGN KEY (datapoint_type_id)
    REFERENCES datapoint_type (datapoint_type_id);

ALTER TABLE datapoint
  ADD CONSTRAINT FK_unit_type_TO_datapoint
    FOREIGN KEY (unit_type_id)
    REFERENCES unit_type (unit_type_id);

ALTER TABLE tile
  ADD CONSTRAINT FK_tile_type_TO_tile
    FOREIGN KEY (tile_type_id)
    REFERENCES tile_type (tile_type_id);

ALTER TABLE app_page
  ADD CONSTRAINT FK_users_TO_app_page
    FOREIGN KEY (user_id)
    REFERENCES users (user_id);

ALTER TABLE app_page
  ADD CONSTRAINT FK_location_TO_app_page
    FOREIGN KEY (location_id)
    REFERENCES location (location_id);

ALTER TABLE tile
  ADD CONSTRAINT FK_app_page_TO_tile
    FOREIGN KEY (app_page_id)
    REFERENCES app_page (app_page_id);

ALTER TABLE tile_datapoint
  ADD CONSTRAINT FK_datapoint_TO_tile_datapoint
    FOREIGN KEY (datapoint_id)
    REFERENCES datapoint (datapoint_id);

ALTER TABLE tile_datapoint
  ADD CONSTRAINT FK_tile_TO_tile_datapoint
    FOREIGN KEY (tile_id)
    REFERENCES tile (tile_id);

ALTER TABLE automation_rule
  ADD CONSTRAINT FK_users_TO_automation_rule
    FOREIGN KEY (created_by)
    REFERENCES users (user_id);

ALTER TABLE automation_rule
  ADD CONSTRAINT FK_location_TO_automation_rule
    FOREIGN KEY (location_id)
    REFERENCES location (location_id);

ALTER TABLE rule_condition
  ADD CONSTRAINT FK_automation_rule_TO_rule_condition
    FOREIGN KEY (rule_id)
    REFERENCES automation_rule (rule_id);

ALTER TABLE rule_condition
  ADD CONSTRAINT FK_datapoint_TO_rule_condition
    FOREIGN KEY (datapoint_id)
    REFERENCES datapoint (datapoint_id);

ALTER TABLE rule_action
  ADD CONSTRAINT FK_automation_rule_TO_rule_action
    FOREIGN KEY (rule_id)
    REFERENCES automation_rule (rule_id);

ALTER TABLE rule_action
  ADD CONSTRAINT FK_datapoint_TO_rule_action
    FOREIGN KEY (datapoint_id)
    REFERENCES datapoint (datapoint_id);

ALTER TABLE obis_definition
  ADD CONSTRAINT FK_datapoint_type_TO_obis_definition
    FOREIGN KEY (default_type_id)
    REFERENCES datapoint_type (datapoint_type_id);

ALTER TABLE obis_definition
  ADD CONSTRAINT FK_unit_type_TO_obis_definition
    FOREIGN KEY (default_unit_id)
    REFERENCES unit_type (unit_type_id);

ALTER TABLE datapoint
  ADD CONSTRAINT FK_obis_definition_TO_datapoint
    FOREIGN KEY (obis_code)
    REFERENCES obis_definition (obis_code);

-- Indexes for Foreign Keys (crucial for performance, especially with postgres_fdw)
CREATE INDEX idx_datapoint_device_channel ON datapoint(device_channel_id);
CREATE INDEX idx_device_channel_device ON device_channel(device_id);
CREATE INDEX idx_devices_location ON devices(location_id);
CREATE INDEX idx_location_parent ON location(parent_location_id);
CREATE INDEX idx_rule_condition_rule ON rule_condition(rule_id);
CREATE INDEX idx_automation_rule_location ON automation_rule(location_id);

-- Child-Elemente
CREATE INDEX idx_rule_action_rule ON rule_action(rule_id);
CREATE INDEX idx_tile_app_page ON tile(app_page_id);
CREATE INDEX idx_tile_datapoint_tile ON tile_datapoint(tile_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);

-- Lesezugriffe
CREATE INDEX idx_user_location_access_user ON user_location_access(user_id);
CREATE INDEX idx_user_location_access_location ON user_location_access(location_id);
CREATE INDEX idx_app_page_user ON app_page(user_id);
CREATE INDEX idx_app_page_location ON app_page(location_id);
CREATE INDEX idx_rule_condition_datapoint ON rule_condition(datapoint_id);
CREATE INDEX idx_rule_action_datapoint ON rule_action(datapoint_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
