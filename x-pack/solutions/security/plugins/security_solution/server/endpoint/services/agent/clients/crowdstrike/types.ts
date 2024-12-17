/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CROWDSTRIKE_NETWORK_STATUS } from './crowdstrike_agent_status_client';

interface Agent {
  name: string;
  id: string;
  ephemeral_id: string;
  type: string;
  version: string;
}

interface ElasticAgent {
  id: string;
  version: string;
  snapshot: boolean;
}

interface Error {
  message: string[];
}

interface Input {
  type: string;
}

interface Ecs {
  version: string;
}

interface Related {
  hosts: string[];
  ip: string[];
  hash: string[];
}

interface DataStream {
  namespace: string;
  type: string;
  dataset: string;
}

interface Geo {
  continent_name: string;
  region_iso_code: string;
  city_name: string;
  country_iso_code: string;
  country_name: string;
  location: {
    lon: number;
    lat: number;
  };
  region_name: string;
}

interface Os {
  platform: string;
  full: string;
}

interface Host {
  geo: Geo;
  hostname: string;
  os: Os;
  ip: string[];
  mac: string[];
}

interface Policy {
  policy_type: string;
  assigned_date: string;
  policy_id: string;
  applied: boolean;
  applied_date: string;
}

interface GlobalConfigPolicy extends Policy {
  settings_hash: string;
}

type DeviceControlPolicy = Policy;

interface FirewallPolicy extends Policy {
  rule_set_id: string;
}

interface RemoteResponsePolicy extends Policy {
  settings_hash: string;
}

interface SensorUpdatePolicy extends Policy {
  uninstall_protection: string;
  settings_hash: string;
}

interface PreventionPolicy extends Policy {
  rule_groups: unknown[];
  settings_hash: string;
}

interface DevicePolicies {
  global_config: GlobalConfigPolicy;
  device_control: DeviceControlPolicy;
  firewall: FirewallPolicy;
  remote_response: RemoteResponsePolicy;
  sensor_update: SensorUpdatePolicy;
  prevention: PreventionPolicy;
}

interface Json {
  connection_ip: string;
  chassis_type: string;
  reduced_functionality_mode: string;
  first_seen: string;
  system_manufacturer: string;
  config_id_base: string;
  last_seen: string;
  chassis_type_desc: string;
  policies: Array<{
    applied: boolean;
    applied_date: string;
    assigned_date: string;
    policy_id: string;
    policy_type: string;
    rule_groups: unknown[];
    settings_hash: string;
  }>;
  cpu_signature: string;
  machine_domain: string;
  minor_version: string;
  system_product_name: string;
  hostname: string;
  os_build: string;
  mac_address: string;
  product_type_desc: string;
  platform_name: string;
  external_ip: string;
  agent_load_flags: string;
  device_id: string;
  group_hash: string;
  provision_status: string;
  os_version: string;
  groups: string[];
  serial_number: string;
  bios_version: string;
  modified_timestamp: string;
  tags: string[];
  local_ip: string;
  site_name: string;
  agent_version: string;
  major_version: string;
  kernel_version: string;
  meta: {
    version: string;
    version_string: string;
  };
  agent_local_time: string;
  bios_manufacturer: string;
  platform_id: string;
  device_policies: DevicePolicies;
  config_id_build: string;
  config_id_platform: string;
  cid: string;
  status: string;
}

interface Event {
  agent_id_status: string;
  ingested: string;
  original: string;
  kind: string;
  category: string[];
  type: string[];
  dataset: string;
}

interface CrowdstrikeHost {
  connection_ip: string;
  agent: {
    local_time: string;
    load_flags: string;
    version: string;
  };
  chassis_type: {
    value: string;
    desc: string;
  };
  reduced_functionality_mode: string;
  first_seen: string;
  last_seen: string;
  bios: {
    version: string;
    manufacturer: string;
  };
  policies: Policy[];
  cpu_signature: string;
  machine_domain: string;
  platform: {
    name: string;
    id: string;
  };
  minor_version: string;
  hostname: string;
  mac_address: string;
  product_type_desc: string;
  id: string;
  external_ip: string;
  os: {
    build: string;
    version: string;
  };
  group_hash: string;
  provision_status: string;
  groups: string[];
  serial_number: string;
  modified_timestamp: string;
  tags: string[];
  local_ip: string;
  site_name: string;
  major_version: string;
  system: {
    product_name: string;
    manufacturer: string;
  };
  kernel_version: string;
  config_id: {
    build: string;
    platform: string;
    base: string;
  };
  meta: {
    version: string;
    version_string: string;
  };
  device_policies: DevicePolicies;
  cid: string;
  status: CROWDSTRIKE_NETWORK_STATUS;
}

interface Crowdstrike {
  host: CrowdstrikeHost;
}

interface Device {
  id: string;
}

export interface RawCrowdstrikeInfo {
  agent: Agent;
  elastic_agent: ElasticAgent;
  error: Error;
  tags: string[];
  input: Input;
  '@timestamp': string;
  ecs: Ecs;
  related: Related;
  data_stream: DataStream;
  host: Host;
  json: Json;
  event: Event;
  crowdstrike: Crowdstrike;
  device: Device;
}
