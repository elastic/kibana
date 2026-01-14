/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Osquery Saved Queries for Endpoint Asset Inventory & CAASM
 *
 * These queries collect comprehensive asset data for:
 * - Core Identity & Facts
 * - Network Exposure & Attack Surface
 * - Privilege Assessment
 * - Security Controls Validation
 * - Persistence Mechanism Detection
 * - Unknown Knowns (Dormant Risk)
 * - Shadow IT Detection
 *
 * All queries are designed to work with the endpoint_assets_transform.ts
 * using these patterns:
 * - Pattern A: top_metrics for latest single values
 * - Pattern B: filter + cardinality/value_count for counts
 * - Pattern C: Boolean flags ('1'/'0') for threshold detection
 *
 * ECS Mapping Convention: osquery.<field_name>
 * Transform will aggregate these into endpoint.* fields
 */

import type { PostureQuery } from './posture_queries';

// =============================================================================
// CORE IDENTITY & FACTS QUERIES
// =============================================================================

/**
 * System Info - Hardware Identity
 *
 * Provides hardware UUID for asset deduplication and inventory.
 * Transform uses top_metrics to get latest values.
 */
export const CORE_SYSTEM_INFO_QUERY: PostureQuery = {
  id: 'core_system_info',
  name: 'Core – System Info',
  description: 'Hardware identity for asset deduplication and inventory',
  query: `
SELECT
  hostname,
  uuid,
  cpu_brand,
  cpu_physical_cores,
  cpu_logical_cores,
  physical_memory,
  hardware_vendor,
  hardware_model,
  hardware_serial
FROM system_info;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.hostname': { field: 'hostname' },
    'osquery.uuid': { field: 'uuid' },
    'osquery.cpu_brand': { field: 'cpu_brand' },
    'osquery.cpu_physical_cores': { field: 'cpu_physical_cores' },
    'osquery.cpu_logical_cores': { field: 'cpu_logical_cores' },
    'osquery.physical_memory': { field: 'physical_memory' },
    'osquery.hardware_vendor': { field: 'hardware_vendor' },
    'osquery.hardware_model': { field: 'hardware_model' },
    'osquery.hardware_serial': { field: 'hardware_serial' },
  },
};

/**
 * OS Version - Operating System Details
 *
 * OS details for compliance, patch management, and vulnerability correlation.
 */
export const CORE_OS_VERSION_QUERY: PostureQuery = {
  id: 'core_os_version',
  name: 'Core – OS Version',
  description: 'OS details for compliance and patch management',
  query: `
SELECT
  name,
  version,
  major,
  minor,
  patch,
  build,
  platform,
  platform_like,
  arch
FROM os_version;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.os_name': { field: 'name' },
    'osquery.os_version': { field: 'version' },
    'osquery.os_major': { field: 'major' },
    'osquery.os_minor': { field: 'minor' },
    'osquery.os_patch': { field: 'patch' },
    'osquery.os_build': { field: 'build' },
    'osquery.os_platform': { field: 'platform' },
    'osquery.os_arch': { field: 'arch' },
  },
};

/**
 * Uptime - System Stability
 *
 * System uptime for stability assessment, reboot detection, and SLA compliance.
 */
export const CORE_UPTIME_QUERY: PostureQuery = {
  id: 'core_uptime',
  name: 'Core – Uptime',
  description: 'System uptime for stability assessment and reboot detection',
  query: `
SELECT
  days,
  hours,
  minutes,
  seconds,
  total_seconds
FROM uptime;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.uptime_days': { field: 'days' },
    'osquery.uptime_hours': { field: 'hours' },
    'osquery.uptime_total_seconds': { field: 'total_seconds' },
  },
};

/**
 * Logged In Users - Active Sessions
 *
 * Current active user sessions for real-time identity awareness.
 * More frequent interval as active sessions matter for security.
 */
export const CORE_LOGGED_IN_USERS_QUERY: PostureQuery = {
  id: 'core_logged_in_users',
  name: 'Core – Logged In Users',
  description: 'Current active user sessions',
  query: `
SELECT
  user,
  tty,
  host,
  time,
  pid,
  type
FROM logged_in_users
WHERE type = 'user';
  `.trim(),
  platform: 'all',
  interval: 900,
  ecsMapping: {
    'osquery.logged_in_user': { field: 'user' },
    'osquery.login_tty': { field: 'tty' },
    'osquery.login_host': { field: 'host' },
    'osquery.login_time': { field: 'time' },
    'osquery.login_type': { field: 'type' },
  },
};

/**
 * Disk Info - Storage Inventory
 *
 * Disk capacity and usage for hardware inventory and capacity planning.
 */
export const CORE_DISK_INFO_QUERY: PostureQuery = {
  id: 'core_disk_info',
  name: 'Core – Disk Info',
  description: 'Storage inventory for capacity planning',
  query: `
SELECT
  device,
  path,
  type,
  blocks_size,
  blocks,
  blocks_free,
  blocks_available,
  inodes,
  inodes_free,
  CAST(blocks * blocks_size AS TEXT) AS disk_size,
  CAST(blocks_free * blocks_size AS TEXT) AS free_space,
  CASE
    WHEN blocks > 0 THEN CAST(((blocks - blocks_free) * 100.0 / blocks) AS INTEGER)
    ELSE 0
  END AS usage_percent
FROM mounts
WHERE path IN ('/', '/home', 'C:\\', 'D:\\')
  AND type NOT IN ('devfs', 'autofs', 'devtmpfs');
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.disk_device': { field: 'device' },
    'osquery.disk_path': { field: 'path' },
    'osquery.disk_type': { field: 'type' },
    'osquery.disk_size': { field: 'disk_size' },
    'osquery.free_space': { field: 'free_space' },
    'osquery.disk_usage_percent': { field: 'usage_percent' },
  },
};

// =============================================================================
// NETWORK EXPOSURE QUERIES
// =============================================================================

/**
 * Network Interfaces - Interface Inventory
 *
 * Network interface inventory for attack surface mapping.
 * Filters out virtual interfaces (docker, veth, loopback).
 */
export const EXPOSURE_NETWORK_INTERFACES_QUERY: PostureQuery = {
  id: 'exposure_network_interfaces',
  name: 'Exposure – Network Interfaces',
  description: 'Network interface inventory for attack surface mapping',
  query: `
SELECT
  interface,
  mac,
  type,
  mtu,
  metric,
  ipackets,
  opackets,
  ibytes,
  obytes,
  CASE WHEN type IN (6, 1) THEN '1' ELSE '0' END AS is_physical
FROM interface_details
WHERE interface NOT LIKE 'lo%'
  AND interface NOT LIKE 'docker%'
  AND interface NOT LIKE 'veth%'
  AND interface NOT LIKE 'br-%'
  AND interface NOT LIKE 'virbr%';
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.interface_name': { field: 'interface' },
    'osquery.interface_mac': { field: 'mac' },
    'osquery.interface_type': { field: 'type' },
    'osquery.interface_mtu': { field: 'mtu' },
    'osquery.is_physical': { field: 'is_physical' },
  },
};

/**
 * Interface Addresses - IP Address Inventory
 *
 * IP addresses assigned to interfaces for network mapping.
 */
export const EXPOSURE_INTERFACE_ADDRESSES_QUERY: PostureQuery = {
  id: 'exposure_interface_addresses',
  name: 'Exposure – Interface Addresses',
  description: 'IP address inventory for network mapping',
  query: `
SELECT
  interface,
  address,
  mask,
  broadcast,
  type,
  CASE
    WHEN address LIKE '10.%' OR address LIKE '192.168.%' OR address LIKE '172.1%' OR address LIKE '172.2%' OR address LIKE '172.3%'
    THEN 'private'
    WHEN address LIKE '127.%' OR address = '::1'
    THEN 'loopback'
    ELSE 'public'
  END AS address_scope
FROM interface_addresses
WHERE address != ''
  AND interface NOT LIKE 'lo%'
  AND interface NOT LIKE 'docker%';
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.addr_interface': { field: 'interface' },
    'osquery.addr_address': { field: 'address' },
    'osquery.addr_mask': { field: 'mask' },
    'osquery.addr_type': { field: 'type' },
    'osquery.addr_scope': { field: 'address_scope' },
  },
};

/**
 * ARP Cache - Network Neighbors
 *
 * Network neighbors for lateral movement context and network mapping.
 */
export const EXPOSURE_ARP_CACHE_QUERY: PostureQuery = {
  id: 'exposure_arp_cache',
  name: 'Exposure – ARP Cache',
  description: 'Network neighbors for lateral movement context',
  query: `
SELECT
  address,
  mac,
  interface,
  permanent
FROM arp_cache
WHERE address NOT LIKE '224.%'
  AND address NOT LIKE '239.%'
  AND address NOT LIKE '255.%'
  AND address != '0.0.0.0';
  `.trim(),
  platform: 'all',
  interval: 1800,
  ecsMapping: {
    'osquery.arp_address': { field: 'address' },
    'osquery.arp_mac': { field: 'mac' },
    'osquery.arp_interface': { field: 'interface' },
    'osquery.arp_permanent': { field: 'permanent' },
  },
};

/**
 * Routes - Routing Table
 *
 * Routing table for network segmentation analysis.
 */
export const EXPOSURE_ROUTES_QUERY: PostureQuery = {
  id: 'exposure_routes',
  name: 'Exposure – Routes',
  description: 'Routing table for network segmentation analysis',
  query: `
SELECT
  destination,
  netmask,
  gateway,
  source,
  interface,
  type,
  metric
FROM routes
WHERE destination != '127.0.0.0'
  AND destination != '::1'
  AND destination != '127.0.0.1';
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.route_destination': { field: 'destination' },
    'osquery.route_netmask': { field: 'netmask' },
    'osquery.route_gateway': { field: 'gateway' },
    'osquery.route_interface': { field: 'interface' },
    'osquery.route_type': { field: 'type' },
  },
};

/**
 * Active Connections - Current Outbound
 *
 * Current outbound connections for C2 detection and network visibility.
 * Includes suspicious port detection for common malware ports.
 */
export const EXPOSURE_ACTIVE_CONNECTIONS_QUERY: PostureQuery = {
  id: 'exposure_active_connections',
  name: 'Exposure – Active Connections',
  description: 'Current outbound connections for C2 detection',
  query: `
SELECT
  p.pid,
  p.name AS process_name,
  p.path AS process_path,
  pos.local_address,
  pos.local_port,
  pos.remote_address,
  pos.remote_port,
  pos.state,
  pos.protocol,
  CASE
    WHEN pos.remote_port IN (4444, 5555, 6666, 1337, 31337, 8080, 8443, 9001, 9002) THEN '1'
    ELSE '0'
  END AS suspicious_port
FROM process_open_sockets pos
JOIN processes p ON pos.pid = p.pid
WHERE pos.state = 'ESTABLISHED'
  AND pos.remote_address != '127.0.0.1'
  AND pos.remote_address != '::1'
  AND pos.remote_address != '';
  `.trim(),
  platform: 'all',
  interval: 900,
  ecsMapping: {
    'osquery.conn_pid': { field: 'pid' },
    'osquery.conn_process_name': { field: 'process_name' },
    'osquery.conn_process_path': { field: 'process_path' },
    'osquery.conn_local_address': { field: 'local_address' },
    'osquery.conn_local_port': { field: 'local_port' },
    'osquery.conn_remote_address': { field: 'remote_address' },
    'osquery.conn_remote_port': { field: 'remote_port' },
    'osquery.conn_state': { field: 'state' },
    'osquery.conn_suspicious_port': { field: 'suspicious_port' },
  },
};

/**
 * DNS Resolvers - DNS Configuration
 *
 * DNS resolver configuration for security policy compliance.
 */
export const EXPOSURE_DNS_RESOLVERS_QUERY: PostureQuery = {
  id: 'exposure_dns_resolvers',
  name: 'Exposure – DNS Resolvers',
  description: 'DNS resolver configuration for security policy',
  query: `
SELECT
  id,
  type,
  address,
  netmask,
  options
FROM dns_resolvers;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.dns_id': { field: 'id' },
    'osquery.dns_type': { field: 'type' },
    'osquery.dns_address': { field: 'address' },
    'osquery.dns_options': { field: 'options' },
  },
};

/**
 * SMB Shares - Windows File Shares
 *
 * Exposed file shares for attack surface mapping.
 * Identifies custom shares vs default admin shares.
 */
export const EXPOSURE_SMB_SHARES_QUERY: PostureQuery = {
  id: 'exposure_smb_shares',
  name: 'Exposure – SMB Shares',
  description: 'Exposed file shares for attack surface mapping',
  query: `
SELECT
  name,
  path,
  type,
  description,
  CASE
    WHEN name NOT IN ('ADMIN$', 'C$', 'D$', 'IPC$', 'print$')
    THEN '1'
    ELSE '0'
  END AS is_custom_share,
  CASE
    WHEN type = 0 THEN 'disk'
    WHEN type = 1 THEN 'printer'
    WHEN type = 2 THEN 'device'
    WHEN type = 3 THEN 'ipc'
    ELSE 'unknown'
  END AS share_type
FROM shared_resources;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.share_name': { field: 'name' },
    'osquery.share_path': { field: 'path' },
    'osquery.share_type': { field: 'share_type' },
    'osquery.share_description': { field: 'description' },
    'osquery.is_custom_share': { field: 'is_custom_share' },
  },
};

// =============================================================================
// PRIVILEGE ASSESSMENT QUERIES
// =============================================================================

/**
 * Root Users - UID 0 Accounts
 *
 * UID 0 accounts for privilege escalation detection.
 * Any account with UID 0 has root-equivalent access.
 */
export const PRIVILEGE_ROOT_USERS_QUERY: PostureQuery = {
  id: 'privilege_root_users',
  name: 'Privilege – Root Users',
  description: 'UID 0 accounts for privilege escalation detection',
  query: `
SELECT
  username,
  uid,
  gid,
  directory,
  shell,
  description,
  '1' AS is_root
FROM users
WHERE uid = 0;
  `.trim(),
  platform: 'posix',
  interval: 3600,
  ecsMapping: {
    'osquery.root_username': { field: 'username' },
    'osquery.root_uid': { field: 'uid' },
    'osquery.root_shell': { field: 'shell' },
    'osquery.root_directory': { field: 'directory' },
    'osquery.is_root': { field: 'is_root' },
  },
};

/**
 * Sudoers Configuration
 *
 * Sudo configuration for privilege escalation mapping.
 * Identifies NOPASSWD and ALL commands which are high risk.
 */
export const PRIVILEGE_SUDOERS_QUERY: PostureQuery = {
  id: 'privilege_sudoers',
  name: 'Privilege – Sudoers Configuration',
  description: 'Sudo configuration for privilege escalation mapping',
  query: `
SELECT
  source,
  header,
  rule_details,
  CASE
    WHEN rule_details LIKE '%NOPASSWD%' THEN '1'
    ELSE '0'
  END AS nopasswd_enabled,
  CASE
    WHEN rule_details LIKE '%ALL=(ALL)%' OR rule_details LIKE '%ALL : ALL%' THEN '1'
    ELSE '0'
  END AS all_commands
FROM sudoers
WHERE header != ''
  AND rule_details != '';
  `.trim(),
  platform: 'posix',
  interval: 3600,
  ecsMapping: {
    'osquery.sudoers_source': { field: 'source' },
    'osquery.sudoers_header': { field: 'header' },
    'osquery.sudoers_rule': { field: 'rule_details' },
    'osquery.sudoers_nopasswd': { field: 'nopasswd_enabled' },
    'osquery.sudoers_all_commands': { field: 'all_commands' },
  },
};

/**
 * Local Groups - Group Inventory
 *
 * All local groups for privilege mapping and RBAC analysis.
 */
export const PRIVILEGE_GROUPS_QUERY: PostureQuery = {
  id: 'privilege_groups',
  name: 'Privilege – Local Groups',
  description: 'All local groups for privilege mapping',
  query: `
SELECT
  gid,
  groupname,
  CASE
    WHEN groupname IN ('Administrators', 'admin', 'sudo', 'wheel', 'root', 'adm') THEN '1'
    ELSE '0'
  END AS is_privileged_group
FROM groups;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.group_gid': { field: 'gid' },
    'osquery.group_name': { field: 'groupname' },
    'osquery.is_privileged_group': { field: 'is_privileged_group' },
  },
};

/**
 * User Groups Membership
 *
 * User to group mappings for privilege analysis.
 */
export const PRIVILEGE_USER_GROUPS_QUERY: PostureQuery = {
  id: 'privilege_user_groups',
  name: 'Privilege – User Group Membership',
  description: 'User to group mappings for privilege analysis',
  query: `
SELECT
  u.username,
  u.uid,
  g.groupname,
  g.gid,
  CASE
    WHEN g.groupname IN ('Administrators', 'admin', 'sudo', 'wheel', 'root', 'adm', 'docker', 'lxd') THEN '1'
    ELSE '0'
  END AS is_privileged_membership
FROM users u
JOIN user_groups ug ON u.uid = ug.uid
JOIN groups g ON ug.gid = g.gid
WHERE u.uid >= 500 OR u.uid = 0;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.membership_username': { field: 'username' },
    'osquery.membership_uid': { field: 'uid' },
    'osquery.membership_groupname': { field: 'groupname' },
    'osquery.membership_gid': { field: 'gid' },
    'osquery.is_privileged_membership': { field: 'is_privileged_membership' },
  },
};

// =============================================================================
// SECURITY CONTROLS QUERIES
// =============================================================================

/**
 * Security Tools - EDR/AV Detection
 *
 * Detect running security tools (EDR, AV) for control validation.
 * Identifies which security tools are actively protecting the endpoint.
 */
export const CONTROL_SECURITY_TOOLS_QUERY: PostureQuery = {
  id: 'control_security_tools',
  name: 'Control – Security Tools',
  description: 'Detect running security tools (EDR, AV)',
  query: `
SELECT
  name,
  pid,
  state,
  path,
  CASE
    WHEN LOWER(name) LIKE '%elastic-agent%' OR LOWER(name) LIKE '%elastic-endpoint%' OR LOWER(name) LIKE '%endpoint-security%' THEN 'elastic'
    WHEN LOWER(name) LIKE '%msmpeng%' OR LOWER(name) LIKE '%defender%' OR LOWER(name) LIKE '%mssense%' THEN 'defender'
    WHEN LOWER(name) LIKE '%falcon%' OR LOWER(name) LIKE '%crowdstrike%' OR LOWER(name) LIKE '%csagent%' THEN 'crowdstrike'
    WHEN LOWER(name) LIKE '%sentinel%' THEN 'sentinelone'
    WHEN LOWER(name) LIKE '%carbon%' OR LOWER(name) LIKE '%cbdefense%' THEN 'carbonblack'
    WHEN LOWER(name) LIKE '%symantec%' OR LOWER(name) LIKE '%sep%' OR LOWER(name) LIKE '%ccsvchst%' THEN 'symantec'
    WHEN LOWER(name) LIKE '%mcafee%' OR LOWER(name) LIKE '%mfe%' THEN 'mcafee'
    WHEN LOWER(name) LIKE '%sophos%' THEN 'sophos'
    WHEN LOWER(name) LIKE '%cylance%' THEN 'cylance'
    WHEN LOWER(name) LIKE '%trend%' OR LOWER(name) LIKE '%tmntsrv%' THEN 'trendmicro'
    WHEN LOWER(name) LIKE '%kaspersky%' OR LOWER(name) LIKE '%avp%' THEN 'kaspersky'
    ELSE 'other'
  END AS security_tool,
  '1' AS is_security_tool
FROM processes
WHERE LOWER(name) LIKE '%elastic-agent%'
   OR LOWER(name) LIKE '%elastic-endpoint%'
   OR LOWER(name) LIKE '%endpoint-security%'
   OR LOWER(name) LIKE '%msmpeng%'
   OR LOWER(name) LIKE '%defender%'
   OR LOWER(name) LIKE '%mssense%'
   OR LOWER(name) LIKE '%falcon%'
   OR LOWER(name) LIKE '%crowdstrike%'
   OR LOWER(name) LIKE '%csagent%'
   OR LOWER(name) LIKE '%sentinel%'
   OR LOWER(name) LIKE '%carbon%'
   OR LOWER(name) LIKE '%cbdefense%'
   OR LOWER(name) LIKE '%symantec%'
   OR LOWER(name) LIKE '%sep%'
   OR LOWER(name) LIKE '%ccsvchst%'
   OR LOWER(name) LIKE '%mcafee%'
   OR LOWER(name) LIKE '%mfe%'
   OR LOWER(name) LIKE '%sophos%'
   OR LOWER(name) LIKE '%cylance%'
   OR LOWER(name) LIKE '%trend%'
   OR LOWER(name) LIKE '%tmntsrv%'
   OR LOWER(name) LIKE '%kaspersky%'
   OR LOWER(name) LIKE '%avp%';
  `.trim(),
  platform: 'all',
  interval: 900,
  ecsMapping: {
    'osquery.security_tool_name': { field: 'name' },
    'osquery.security_tool': { field: 'security_tool' },
    'osquery.security_tool_pid': { field: 'pid' },
    'osquery.security_tool_state': { field: 'state' },
    'osquery.security_tool_path': { field: 'path' },
    'osquery.is_security_tool': { field: 'is_security_tool' },
  },
};

/**
 * Windows Update Status
 *
 * Windows update configuration and history for patch compliance.
 */
export const CONTROL_WINDOWS_UPDATE_QUERY: PostureQuery = {
  id: 'control_windows_update',
  name: 'Control – Windows Update Status',
  description: 'Windows update configuration for patch compliance',
  query: `
SELECT
  hotfix_id,
  description,
  installed_on,
  installed_by
FROM patches
ORDER BY installed_on DESC
LIMIT 10;
  `.trim(),
  platform: 'windows',
  interval: 86400,
  ecsMapping: {
    'osquery.patch_hotfix_id': { field: 'hotfix_id' },
    'osquery.patch_description': { field: 'description' },
    'osquery.patch_installed_on': { field: 'installed_on' },
    'osquery.patch_installed_by': { field: 'installed_by' },
  },
};

/**
 * macOS Gatekeeper Status
 *
 * Gatekeeper app security policy status for macOS.
 */
export const CONTROL_MACOS_GATEKEEPER_QUERY: PostureQuery = {
  id: 'control_macos_gatekeeper',
  name: 'Control – macOS Gatekeeper',
  description: 'Gatekeeper app security policy status',
  query: `
SELECT
  assessments_enabled,
  dev_id_enabled,
  version
FROM gatekeeper;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  ecsMapping: {
    'osquery.assessments_enabled': { field: 'assessments_enabled' },
    'osquery.dev_id_enabled': { field: 'dev_id_enabled' },
    'osquery.gatekeeper_version': { field: 'version' },
  },
};

/**
 * macOS XProtect Version
 *
 * XProtect antimalware signature version for macOS.
 */
export const CONTROL_MACOS_XPROTECT_QUERY: PostureQuery = {
  id: 'control_macos_xprotect',
  name: 'Control – macOS XProtect',
  description: 'XProtect antimalware signature version',
  query: `
SELECT
  name,
  version,
  build,
  source
FROM xprotect_meta;
  `.trim(),
  platform: 'darwin',
  interval: 86400,
  ecsMapping: {
    'osquery.xprotect_name': { field: 'name' },
    'osquery.xprotect_version': { field: 'version' },
    'osquery.xprotect_build': { field: 'build' },
  },
};

// =============================================================================
// PERSISTENCE MECHANISM QUERIES
// =============================================================================

/**
 * Systemd Units - Linux Services
 *
 * Systemd service and timer units for persistence detection.
 * Identifies custom units outside standard system paths.
 */
export const PERSISTENCE_SYSTEMD_UNITS_QUERY: PostureQuery = {
  id: 'persistence_systemd_units',
  name: 'Persistence – Systemd Units',
  description: 'Systemd service and timer units for persistence detection',
  query: `
SELECT
  id,
  description,
  load_state,
  active_state,
  sub_state,
  fragment_path,
  CASE
    WHEN id LIKE '%.timer' THEN 'timer'
    WHEN id LIKE '%.service' THEN 'service'
    ELSE 'other'
  END AS unit_type,
  CASE
    WHEN fragment_path NOT LIKE '/usr/lib/systemd%'
     AND fragment_path NOT LIKE '/lib/systemd%'
     AND fragment_path NOT LIKE '/run/systemd%'
    THEN '1'
    ELSE '0'
  END AS is_custom_unit
FROM systemd_units
WHERE active_state = 'active'
  AND (id LIKE '%.timer' OR id LIKE '%.service');
  `.trim(),
  platform: 'linux',
  interval: 1800,
  ecsMapping: {
    'osquery.unit_id': { field: 'id' },
    'osquery.unit_description': { field: 'description' },
    'osquery.unit_load_state': { field: 'load_state' },
    'osquery.unit_active_state': { field: 'active_state' },
    'osquery.unit_path': { field: 'fragment_path' },
    'osquery.unit_type': { field: 'unit_type' },
    'osquery.is_custom_unit': { field: 'is_custom_unit' },
  },
};

/**
 * Crontab - Cron Jobs Full
 *
 * All cron jobs for persistence mechanism inventory.
 */
export const PERSISTENCE_CRONTAB_QUERY: PostureQuery = {
  id: 'persistence_crontab',
  name: 'Persistence – Cron Jobs',
  description: 'All cron jobs for persistence mechanism inventory',
  query: `
SELECT
  minute,
  hour,
  day_of_month,
  month,
  day_of_week,
  command,
  path,
  CASE
    WHEN command LIKE '%http://%' OR command LIKE '%https://%'
      OR command LIKE '%curl %' OR command LIKE '%wget %'
    THEN '1'
    ELSE '0'
  END AS calls_external,
  CASE
    WHEN path LIKE '/var/spool/cron%' OR path LIKE '/etc/cron%'
    THEN 'system'
    ELSE 'user'
  END AS cron_type
FROM crontab;
  `.trim(),
  platform: 'posix',
  interval: 1800,
  ecsMapping: {
    'osquery.cron_minute': { field: 'minute' },
    'osquery.cron_hour': { field: 'hour' },
    'osquery.cron_command': { field: 'command' },
    'osquery.cron_path': { field: 'path' },
    'osquery.cron_calls_external': { field: 'calls_external' },
    'osquery.cron_type': { field: 'cron_type' },
  },
};

/**
 * WMI Event Consumers - Windows Persistence
 *
 * WMI persistence mechanism detection.
 */
export const PERSISTENCE_WMI_CONSUMERS_QUERY: PostureQuery = {
  id: 'persistence_wmi_consumers',
  name: 'Persistence – WMI Event Consumers',
  description: 'WMI persistence mechanism detection',
  query: `
SELECT
  name,
  scripting_engine,
  script_file_name,
  script_text,
  command_line_template,
  executable_path,
  class,
  relative_path,
  '1' AS is_wmi_persistence
FROM wmi_cli_event_consumers;
  `.trim(),
  platform: 'windows',
  interval: 1800,
  ecsMapping: {
    'osquery.wmi_consumer_name': { field: 'name' },
    'osquery.wmi_script_engine': { field: 'scripting_engine' },
    'osquery.wmi_script_text': { field: 'script_text' },
    'osquery.wmi_command_line': { field: 'command_line_template' },
    'osquery.wmi_executable': { field: 'executable_path' },
    'osquery.wmi_class': { field: 'class' },
    'osquery.is_wmi_persistence': { field: 'is_wmi_persistence' },
  },
};

/**
 * WMI Event Filters - Windows Persistence
 *
 * WMI event filters that trigger persistence mechanisms.
 */
export const PERSISTENCE_WMI_FILTERS_QUERY: PostureQuery = {
  id: 'persistence_wmi_filters',
  name: 'Persistence – WMI Event Filters',
  description: 'WMI event filters that trigger persistence',
  query: `
SELECT
  name,
  query,
  query_language,
  class,
  relative_path,
  '1' AS is_wmi_filter
FROM wmi_filter_consumer_binding;
  `.trim(),
  platform: 'windows',
  interval: 1800,
  ecsMapping: {
    'osquery.wmi_filter_name': { field: 'name' },
    'osquery.wmi_filter_query': { field: 'query' },
    'osquery.wmi_filter_class': { field: 'class' },
    'osquery.is_wmi_filter': { field: 'is_wmi_filter' },
  },
};

/**
 * Kernel Modules - Linux
 *
 * Loaded kernel modules for rootkit detection.
 * Identifies unusual modules outside common system modules.
 */
export const PERSISTENCE_KERNEL_MODULES_QUERY: PostureQuery = {
  id: 'persistence_kernel_modules',
  name: 'Persistence – Kernel Modules',
  description: 'Loaded kernel modules for rootkit detection',
  query: `
SELECT
  name,
  size,
  used_by,
  status,
  address,
  CASE
    WHEN name NOT IN ('ext4', 'xfs', 'btrfs', 'nfs', 'nfsv4', 'cifs', 'fuse', 'overlay',
                      'iptable_filter', 'iptable_nat', 'nf_conntrack', 'nf_nat', 'nf_tables',
                      'bridge', 'br_netfilter', 'veth', 'tun', 'tap', 'vxlan',
                      'kvm', 'kvm_intel', 'kvm_amd', 'virtio', 'virtio_pci', 'virtio_net',
                      'nvidia', 'amdgpu', 'i915', 'nouveau', 'drm',
                      'usb_storage', 'usbhid', 'hid_generic',
                      'snd', 'snd_hda_intel', 'snd_hda_codec', 'soundcore',
                      'bluetooth', 'btusb', 'rfkill',
                      'dm_crypt', 'dm_mod', 'dm_multipath',
                      'loop', 'sr_mod', 'cdrom', 'sg')
    THEN '1'
    ELSE '0'
  END AS is_unusual_module
FROM kernel_modules;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  ecsMapping: {
    'osquery.module_name': { field: 'name' },
    'osquery.module_size': { field: 'size' },
    'osquery.module_used_by': { field: 'used_by' },
    'osquery.module_status': { field: 'status' },
    'osquery.module_address': { field: 'address' },
    'osquery.is_unusual_module': { field: 'is_unusual_module' },
  },
};

/**
 * Kernel Extensions - macOS
 *
 * Loaded kernel extensions for rootkit detection.
 */
export const PERSISTENCE_KEXT_QUERY: PostureQuery = {
  id: 'persistence_kernel_extensions',
  name: 'Persistence – Kernel Extensions',
  description: 'Loaded kernel extensions for rootkit detection',
  query: `
SELECT
  name,
  version,
  path,
  linked_against,
  idx,
  refs,
  size,
  CASE
    WHEN path NOT LIKE '/System/Library/Extensions%'
     AND path NOT LIKE '/Library/Apple/System/Library/Extensions%'
    THEN '1'
    ELSE '0'
  END AS is_third_party
FROM kernel_extensions;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  ecsMapping: {
    'osquery.kext_name': { field: 'name' },
    'osquery.kext_version': { field: 'version' },
    'osquery.kext_path': { field: 'path' },
    'osquery.kext_size': { field: 'size' },
    'osquery.is_third_party': { field: 'is_third_party' },
  },
};

// =============================================================================
// UNKNOWN KNOWNS - DORMANT RISK QUERIES
// =============================================================================

/**
 * Expiring Certificates
 *
 * Certificates expiring within 30 days or already expired.
 */
export const UNKNOWN_KNOWNS_EXPIRING_CERTS_QUERY: PostureQuery = {
  id: 'unknown_knowns_expiring_certs',
  name: 'Unknown Knowns – Expiring Certificates',
  description: 'Certificates expiring within 30 days',
  query: `
SELECT
  common_name,
  issuer,
  subject,
  not_valid_after,
  not_valid_before,
  serial,
  signing_algorithm,
  path,
  CAST((CAST(not_valid_after AS INTEGER) - strftime('%s', 'now')) / 86400 AS INTEGER) AS days_until_expiry,
  CASE
    WHEN CAST((CAST(not_valid_after AS INTEGER) - strftime('%s', 'now')) / 86400 AS INTEGER) <= 30
     AND CAST((CAST(not_valid_after AS INTEGER) - strftime('%s', 'now')) / 86400 AS INTEGER) > 0
    THEN '1'
    ELSE '0'
  END AS expiring_30d,
  CASE
    WHEN CAST(not_valid_after AS INTEGER) < strftime('%s', 'now')
    THEN '1'
    ELSE '0'
  END AS already_expired
FROM certificates
WHERE path != ''
  AND common_name != '';
  `.trim(),
  platform: 'all',
  interval: 86400,
  ecsMapping: {
    'osquery.cert_common_name': { field: 'common_name' },
    'osquery.cert_issuer': { field: 'issuer' },
    'osquery.cert_not_valid_after': { field: 'not_valid_after' },
    'osquery.cert_path': { field: 'path' },
    'osquery.cert_days_until_expiry': { field: 'days_until_expiry' },
    'osquery.cert_expiring_30d': { field: 'expiring_30d' },
    'osquery.cert_already_expired': { field: 'already_expired' },
  },
};

/**
 * Windows Services Running as SYSTEM
 *
 * Services with excessive privileges (non-standard SYSTEM services).
 */
export const UNKNOWN_KNOWNS_SERVICES_AS_SYSTEM_QUERY: PostureQuery = {
  id: 'unknown_knowns_services_as_system',
  name: 'Unknown Knowns – Services as SYSTEM',
  description: 'Services with excessive privileges',
  query: `
SELECT
  name,
  display_name,
  path,
  status,
  user_account,
  start_type,
  CASE
    WHEN user_account IN ('LocalSystem', 'NT AUTHORITY\\SYSTEM', 'SYSTEM')
    THEN '1'
    ELSE '0'
  END AS runs_as_system,
  CASE
    WHEN name NOT IN ('wuauserv', 'BITS', 'CryptSvc', 'DcomLaunch', 'EventLog',
                      'LanmanServer', 'LanmanWorkstation', 'netprofm', 'NlaSvc',
                      'PlugPlay', 'Power', 'Schedule', 'SENS', 'Spooler',
                      'Themes', 'Winmgmt', 'WSearch', 'MpsSvc', 'WinDefend',
                      'wscsvc', 'SecurityHealthService', 'SysMain', 'Dnscache',
                      'iphlpsvc', 'lmhosts', 'nsi', 'Dhcp', 'W32Time',
                      'TrustedInstaller', 'msiserver', 'gpsvc', 'ProfSvc')
     AND user_account IN ('LocalSystem', 'NT AUTHORITY\\SYSTEM', 'SYSTEM')
    THEN '1'
    ELSE '0'
  END AS non_standard_system_service
FROM services
WHERE status = 'RUNNING';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.svc_name': { field: 'name' },
    'osquery.svc_display_name': { field: 'display_name' },
    'osquery.svc_path': { field: 'path' },
    'osquery.svc_status': { field: 'status' },
    'osquery.svc_user_account': { field: 'user_account' },
    'osquery.svc_runs_as_system': { field: 'runs_as_system' },
    'osquery.svc_non_standard': { field: 'non_standard_system_service' },
  },
};

/**
 * POSIX Processes Running as Root
 *
 * Processes running as root that are not standard system processes.
 */
export const UNKNOWN_KNOWNS_PROCESSES_AS_ROOT_QUERY: PostureQuery = {
  id: 'unknown_knowns_processes_as_root',
  name: 'Unknown Knowns – Processes as Root',
  description: 'Processes running as root',
  query: `
SELECT
  p.name,
  p.path,
  p.cmdline,
  p.uid,
  p.pid,
  '1' AS runs_as_root,
  CASE
    WHEN p.uid = 0
     AND p.name NOT IN ('init', 'systemd', 'kernel', 'kthreadd', 'rcu_sched', 'rcu_bh',
                        'sshd', 'cron', 'crond', 'rsyslogd', 'auditd', 'polkitd',
                        'dockerd', 'containerd', 'kubelet', 'kube-proxy',
                        'NetworkManager', 'systemd-journald', 'systemd-udevd',
                        'systemd-logind', 'systemd-resolved', 'systemd-timesyncd',
                        'dbus-daemon', 'avahi-daemon', 'cupsd', 'gdm', 'lightdm',
                        'postgres', 'mysqld', 'nginx', 'apache2', 'httpd',
                        'launchd', 'WindowServer', 'loginwindow', 'securityd',
                        'cfprefsd', 'configd', 'coreservicesd', 'distnoted')
    THEN '1'
    ELSE '0'
  END AS non_standard_root_process
FROM processes p
WHERE p.uid = 0
  AND p.pid > 1;
  `.trim(),
  platform: 'posix',
  interval: 3600,
  ecsMapping: {
    'osquery.proc_name': { field: 'name' },
    'osquery.proc_path': { field: 'path' },
    'osquery.proc_cmdline': { field: 'cmdline' },
    'osquery.proc_uid': { field: 'uid' },
    'osquery.proc_pid': { field: 'pid' },
    'osquery.proc_runs_as_root': { field: 'runs_as_root' },
    'osquery.proc_non_standard': { field: 'non_standard_root_process' },
  },
};

/**
 * Dormant Admin Accounts
 *
 * Admin accounts older than 90 days without recent activity.
 */
export const UNKNOWN_KNOWNS_DORMANT_ADMINS_QUERY: PostureQuery = {
  id: 'unknown_knowns_dormant_admins',
  name: 'Unknown Knowns – Dormant Admin Accounts',
  description: 'Admin accounts older than 90 days without recent review',
  query: `
SELECT
  u.username,
  u.uid,
  g.groupname,
  u.directory,
  f.mtime AS home_mtime,
  CAST((strftime('%s', 'now') - COALESCE(f.mtime, 0)) / 86400 AS INTEGER) AS days_since_home_modified,
  CASE
    WHEN f.mtime IS NULL OR (strftime('%s', 'now') - f.mtime) > (90 * 86400) THEN '1'
    ELSE '0'
  END AS dormant_admin_90d
FROM users u
JOIN user_groups ug ON u.uid = ug.uid
JOIN groups g ON ug.gid = g.gid
LEFT JOIN file f ON f.path = u.directory
WHERE g.groupname IN ('Administrators', 'admin', 'sudo', 'wheel', 'adm')
  AND (u.uid >= 500 OR u.uid = 0);
  `.trim(),
  platform: 'all',
  interval: 86400,
  ecsMapping: {
    'osquery.dormant_admin_username': { field: 'username' },
    'osquery.dormant_admin_uid': { field: 'uid' },
    'osquery.dormant_admin_group': { field: 'groupname' },
    'osquery.dormant_admin_directory': { field: 'directory' },
    'osquery.dormant_admin_days': { field: 'days_since_home_modified' },
    'osquery.dormant_admin_90d': { field: 'dormant_admin_90d' },
  },
};

/**
 * SSH Known Hosts Age
 *
 * SSH known_hosts file age for trust decay detection.
 */
export const UNKNOWN_KNOWNS_SSH_KNOWN_HOSTS_QUERY: PostureQuery = {
  id: 'unknown_knowns_ssh_known_hosts',
  name: 'Unknown Knowns – SSH Known Hosts Age',
  description: 'SSH known_hosts file age for trust decay detection',
  query: `
SELECT
  u.username,
  u.uid,
  u.directory,
  f.path,
  f.mtime,
  f.size,
  CAST((strftime('%s', 'now') - f.mtime) / 86400 AS INTEGER) AS known_hosts_age_days,
  CASE
    WHEN (strftime('%s', 'now') - f.mtime) > (180 * 86400) THEN '1'
    ELSE '0'
  END AS known_hosts_old
FROM users u
JOIN file f ON f.path = u.directory || '/.ssh/known_hosts'
WHERE f.size > 0
  AND (u.uid >= 500 OR u.uid = 0);
  `.trim(),
  platform: 'posix',
  interval: 86400,
  ecsMapping: {
    'osquery.known_hosts_username': { field: 'username' },
    'osquery.known_hosts_path': { field: 'path' },
    'osquery.known_hosts_mtime': { field: 'mtime' },
    'osquery.known_hosts_age_days': { field: 'known_hosts_age_days' },
    'osquery.known_hosts_old': { field: 'known_hosts_old' },
  },
};

// =============================================================================
// SHADOW IT DETECTION QUERIES
// =============================================================================

/**
 * VPN Clients Detection
 *
 * Detect installed VPN clients for shadow IT visibility.
 */
export const SHADOW_IT_VPN_CLIENTS_QUERY: PostureQuery = {
  id: 'shadow_it_vpn_clients',
  name: 'Shadow IT – VPN Clients',
  description: 'Detect installed VPN clients',
  query: `
SELECT
  name,
  path,
  pid,
  state,
  CASE
    WHEN LOWER(name) LIKE '%openvpn%' THEN 'openvpn'
    WHEN LOWER(name) LIKE '%wireguard%' OR LOWER(name) LIKE '%wg-quick%' THEN 'wireguard'
    WHEN LOWER(name) LIKE '%nordvpn%' THEN 'nordvpn'
    WHEN LOWER(name) LIKE '%expressvpn%' THEN 'expressvpn'
    WHEN LOWER(name) LIKE '%surfshark%' THEN 'surfshark'
    WHEN LOWER(name) LIKE '%protonvpn%' THEN 'protonvpn'
    WHEN LOWER(name) LIKE '%tunnelbear%' THEN 'tunnelbear'
    WHEN LOWER(name) LIKE '%cisco%anyconnect%' OR LOWER(name) LIKE '%vpnagent%' THEN 'cisco_anyconnect'
    WHEN LOWER(name) LIKE '%globalprotect%' THEN 'palo_alto'
    WHEN LOWER(name) LIKE '%forticlient%' THEN 'fortinet'
    WHEN LOWER(name) LIKE '%f5%' OR LOWER(name) LIKE '%big-ip%' THEN 'f5'
    WHEN LOWER(name) LIKE '%pulse%' OR LOWER(name) LIKE '%junos%' THEN 'pulse_secure'
    ELSE 'other_vpn'
  END AS vpn_type,
  '1' AS is_vpn_client
FROM processes
WHERE LOWER(name) LIKE '%vpn%'
   OR LOWER(name) LIKE '%wireguard%'
   OR LOWER(name) LIKE '%wg-quick%'
   OR LOWER(name) LIKE '%openvpn%'
   OR LOWER(name) LIKE '%vpnagent%'
   OR LOWER(name) LIKE '%globalprotect%'
   OR LOWER(name) LIKE '%forticlient%';
  `.trim(),
  platform: 'all',
  interval: 1800,
  ecsMapping: {
    'osquery.vpn_process_name': { field: 'name' },
    'osquery.vpn_path': { field: 'path' },
    'osquery.vpn_type': { field: 'vpn_type' },
    'osquery.vpn_pid': { field: 'pid' },
    'osquery.vpn_state': { field: 'state' },
    'osquery.is_vpn_client': { field: 'is_vpn_client' },
  },
};

/**
 * Remote Access Tools Detection
 *
 * Detect TeamViewer, AnyDesk, and similar remote access tools.
 */
export const SHADOW_IT_REMOTE_ACCESS_QUERY: PostureQuery = {
  id: 'shadow_it_remote_access',
  name: 'Shadow IT – Remote Access Tools',
  description: 'Detect TeamViewer, AnyDesk, and similar tools',
  query: `
SELECT
  name,
  path,
  pid,
  state,
  CASE
    WHEN LOWER(name) LIKE '%teamviewer%' THEN 'teamviewer'
    WHEN LOWER(name) LIKE '%anydesk%' THEN 'anydesk'
    WHEN LOWER(name) LIKE '%logmein%' OR LOWER(name) LIKE '%hamachi%' THEN 'logmein'
    WHEN LOWER(name) LIKE '%bomgar%' OR LOWER(name) LIKE '%beyondtrust%' THEN 'beyondtrust'
    WHEN LOWER(name) LIKE '%screenconnect%' OR LOWER(name) LIKE '%connectwise%' THEN 'connectwise'
    WHEN LOWER(name) LIKE '%splashtop%' THEN 'splashtop'
    WHEN LOWER(name) LIKE '%rustdesk%' THEN 'rustdesk'
    WHEN LOWER(name) LIKE '%ammyy%' THEN 'ammyy'
    WHEN LOWER(name) LIKE '%supremo%' THEN 'supremo'
    WHEN LOWER(name) LIKE '%ultraviewer%' THEN 'ultraviewer'
    WHEN LOWER(name) LIKE '%remotepc%' THEN 'remotepc'
    WHEN LOWER(name) LIKE '%dameware%' THEN 'dameware'
    ELSE 'other_remote'
  END AS remote_tool_type,
  '1' AS is_remote_tool
FROM processes
WHERE LOWER(name) LIKE '%teamviewer%'
   OR LOWER(name) LIKE '%anydesk%'
   OR LOWER(name) LIKE '%logmein%'
   OR LOWER(name) LIKE '%hamachi%'
   OR LOWER(name) LIKE '%bomgar%'
   OR LOWER(name) LIKE '%beyondtrust%'
   OR LOWER(name) LIKE '%screenconnect%'
   OR LOWER(name) LIKE '%connectwise%'
   OR LOWER(name) LIKE '%splashtop%'
   OR LOWER(name) LIKE '%rustdesk%'
   OR LOWER(name) LIKE '%ammyy%'
   OR LOWER(name) LIKE '%supremo%'
   OR LOWER(name) LIKE '%ultraviewer%'
   OR LOWER(name) LIKE '%remotepc%'
   OR LOWER(name) LIKE '%dameware%';
  `.trim(),
  platform: 'all',
  interval: 1800,
  ecsMapping: {
    'osquery.remote_tool_name': { field: 'name' },
    'osquery.remote_tool_path': { field: 'path' },
    'osquery.remote_tool_type': { field: 'remote_tool_type' },
    'osquery.remote_tool_pid': { field: 'pid' },
    'osquery.remote_tool_state': { field: 'state' },
    'osquery.is_remote_tool': { field: 'is_remote_tool' },
  },
};

/**
 * Cloud CLI Tools Detection
 *
 * Detect installed cloud CLI tools (AWS, GCP, Azure).
 */
export const SHADOW_IT_CLOUD_CLI_QUERY: PostureQuery = {
  id: 'shadow_it_cloud_cli',
  name: 'Shadow IT – Cloud CLI Tools',
  description: 'Detect installed cloud CLI tools',
  query: `
SELECT
  name,
  path,
  pid,
  CASE
    WHEN LOWER(name) LIKE '%aws%' THEN 'aws'
    WHEN LOWER(name) LIKE '%gcloud%' OR LOWER(name) LIKE '%gsutil%' THEN 'gcp'
    WHEN LOWER(name) LIKE '%az%' OR LOWER(name) LIKE '%azure%' THEN 'azure'
    WHEN LOWER(name) LIKE '%kubectl%' THEN 'kubernetes'
    WHEN LOWER(name) LIKE '%terraform%' THEN 'terraform'
    WHEN LOWER(name) LIKE '%ansible%' THEN 'ansible'
    WHEN LOWER(name) LIKE '%docker%' THEN 'docker'
    WHEN LOWER(name) LIKE '%helm%' THEN 'helm'
    ELSE 'other_cloud'
  END AS cloud_tool_type,
  '1' AS is_cloud_tool
FROM processes
WHERE LOWER(name) IN ('aws', 'gcloud', 'gsutil', 'az', 'kubectl', 'terraform', 'ansible', 'docker', 'helm')
   OR LOWER(path) LIKE '%aws-cli%'
   OR LOWER(path) LIKE '%google-cloud-sdk%'
   OR LOWER(path) LIKE '%azure-cli%';
  `.trim(),
  platform: 'all',
  interval: 1800,
  ecsMapping: {
    'osquery.cloud_tool_name': { field: 'name' },
    'osquery.cloud_tool_path': { field: 'path' },
    'osquery.cloud_tool_type': { field: 'cloud_tool_type' },
    'osquery.cloud_tool_pid': { field: 'pid' },
    'osquery.is_cloud_tool': { field: 'is_cloud_tool' },
  },
};

// =============================================================================
// CONTAINER AWARENESS QUERIES
// =============================================================================

/**
 * Docker Containers
 *
 * Running Docker containers for container inventory.
 */
export const CONTAINER_DOCKER_CONTAINERS_QUERY: PostureQuery = {
  id: 'container_docker_containers',
  name: 'Container – Docker Containers',
  description: 'Running Docker containers for container inventory',
  query: `
SELECT
  id,
  name,
  image,
  image_id,
  command,
  created,
  state,
  status,
  pid,
  CASE WHEN state = 'running' THEN '1' ELSE '0' END AS is_running,
  CASE
    WHEN name LIKE '%test%' OR name LIKE '%dev%' OR name LIKE '%debug%'
    THEN '1'
    ELSE '0'
  END AS is_non_production
FROM docker_containers;
  `.trim(),
  platform: 'posix',
  interval: 900,
  ecsMapping: {
    'osquery.container_id': { field: 'id' },
    'osquery.container_name': { field: 'name' },
    'osquery.container_image': { field: 'image' },
    'osquery.container_image_id': { field: 'image_id' },
    'osquery.container_state': { field: 'state' },
    'osquery.container_status': { field: 'status' },
    'osquery.container_pid': { field: 'pid' },
    'osquery.container_is_running': { field: 'is_running' },
    'osquery.container_is_non_production': { field: 'is_non_production' },
  },
};

/**
 * Docker Images
 *
 * Docker images for container image inventory.
 */
export const CONTAINER_DOCKER_IMAGES_QUERY: PostureQuery = {
  id: 'container_docker_images',
  name: 'Container – Docker Images',
  description: 'Docker images for container image inventory',
  query: `
SELECT
  id,
  created,
  size_bytes,
  tags
FROM docker_images;
  `.trim(),
  platform: 'posix',
  interval: 3600,
  ecsMapping: {
    'osquery.image_id': { field: 'id' },
    'osquery.image_created': { field: 'created' },
    'osquery.image_size_bytes': { field: 'size_bytes' },
    'osquery.image_tags': { field: 'tags' },
  },
};

// =============================================================================
// SOFTWARE INVENTORY QUERIES
// =============================================================================

/**
 * Browser Extensions - Chrome
 *
 * Chrome browser extensions for software inventory and security.
 */
export const SOFTWARE_CHROME_EXTENSIONS_QUERY: PostureQuery = {
  id: 'software_chrome_extensions',
  name: 'Software – Chrome Extensions',
  description: 'Chrome browser extensions for security visibility',
  query: `
SELECT
  uid,
  name,
  identifier,
  version,
  description,
  path,
  permissions,
  CASE
    WHEN permissions LIKE '%<all_urls>%' OR permissions LIKE '%tabs%' OR permissions LIKE '%webRequest%'
    THEN '1'
    ELSE '0'
  END AS has_sensitive_permissions,
  'chrome' AS browser_type
FROM chrome_extensions;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.ext_name': { field: 'name' },
    'osquery.ext_identifier': { field: 'identifier' },
    'osquery.ext_version': { field: 'version' },
    'osquery.ext_path': { field: 'path' },
    'osquery.ext_permissions': { field: 'permissions' },
    'osquery.ext_sensitive_permissions': { field: 'has_sensitive_permissions' },
    'osquery.browser_type': { field: 'browser_type' },
  },
};

/**
 * Browser Extensions - Firefox
 *
 * Firefox browser extensions for software inventory and security.
 */
export const SOFTWARE_FIREFOX_EXTENSIONS_QUERY: PostureQuery = {
  id: 'software_firefox_extensions',
  name: 'Software – Firefox Extensions',
  description: 'Firefox browser extensions for security visibility',
  query: `
SELECT
  uid,
  name,
  identifier,
  version,
  description,
  path,
  permissions,
  CASE
    WHEN permissions LIKE '%<all_urls>%' OR permissions LIKE '%tabs%' OR permissions LIKE '%webRequest%'
    THEN '1'
    ELSE '0'
  END AS has_sensitive_permissions,
  'firefox' AS browser_type
FROM firefox_addons;
  `.trim(),
  platform: 'all',
  interval: 3600,
  ecsMapping: {
    'osquery.ext_name': { field: 'name' },
    'osquery.ext_identifier': { field: 'identifier' },
    'osquery.ext_version': { field: 'version' },
    'osquery.ext_path': { field: 'path' },
    'osquery.ext_permissions': { field: 'permissions' },
    'osquery.ext_sensitive_permissions': { field: 'has_sensitive_permissions' },
    'osquery.browser_type': { field: 'browser_type' },
  },
};

/**
 * Python Packages
 *
 * Installed Python packages for software supply chain visibility.
 */
export const SOFTWARE_PYTHON_PACKAGES_QUERY: PostureQuery = {
  id: 'software_python_packages',
  name: 'Software – Python Packages',
  description: 'Installed Python packages for supply chain visibility',
  query: `
SELECT
  name,
  version,
  summary,
  author,
  license,
  path,
  directory
FROM python_packages;
  `.trim(),
  platform: 'all',
  interval: 86400,
  ecsMapping: {
    'osquery.python_pkg_name': { field: 'name' },
    'osquery.python_pkg_version': { field: 'version' },
    'osquery.python_pkg_author': { field: 'author' },
    'osquery.python_pkg_license': { field: 'license' },
    'osquery.python_pkg_path': { field: 'path' },
  },
};

/**
 * NPM Packages
 *
 * Installed npm packages for software supply chain visibility.
 */
export const SOFTWARE_NPM_PACKAGES_QUERY: PostureQuery = {
  id: 'software_npm_packages',
  name: 'Software – NPM Packages',
  description: 'Installed npm packages for supply chain visibility',
  query: `
SELECT
  name,
  version,
  description,
  author,
  license,
  path,
  directory
FROM npm_packages;
  `.trim(),
  platform: 'all',
  interval: 86400,
  ecsMapping: {
    'osquery.npm_pkg_name': { field: 'name' },
    'osquery.npm_pkg_version': { field: 'version' },
    'osquery.npm_pkg_author': { field: 'author' },
    'osquery.npm_pkg_license': { field: 'license' },
    'osquery.npm_pkg_path': { field: 'path' },
  },
};

/**
 * Homebrew Packages (macOS)
 *
 * Installed Homebrew packages for software inventory.
 */
export const SOFTWARE_HOMEBREW_PACKAGES_QUERY: PostureQuery = {
  id: 'software_homebrew_packages',
  name: 'Software – Homebrew Packages',
  description: 'Installed Homebrew packages for software inventory',
  query: `
SELECT
  name,
  version,
  path,
  prefix
FROM homebrew_packages;
  `.trim(),
  platform: 'darwin',
  interval: 86400,
  ecsMapping: {
    'osquery.brew_pkg_name': { field: 'name' },
    'osquery.brew_pkg_version': { field: 'version' },
    'osquery.brew_pkg_path': { field: 'path' },
  },
};

// =============================================================================
// QUERY COLLECTIONS
// =============================================================================

/**
 * Core Identity & Facts Queries
 */
export const CORE_IDENTITY_QUERIES: PostureQuery[] = [
  CORE_SYSTEM_INFO_QUERY,
  CORE_OS_VERSION_QUERY,
  CORE_UPTIME_QUERY,
  CORE_LOGGED_IN_USERS_QUERY,
  CORE_DISK_INFO_QUERY,
];

/**
 * Network Exposure Queries
 */
export const NETWORK_EXPOSURE_QUERIES: PostureQuery[] = [
  EXPOSURE_NETWORK_INTERFACES_QUERY,
  EXPOSURE_INTERFACE_ADDRESSES_QUERY,
  EXPOSURE_ARP_CACHE_QUERY,
  EXPOSURE_ROUTES_QUERY,
  EXPOSURE_ACTIVE_CONNECTIONS_QUERY,
  EXPOSURE_DNS_RESOLVERS_QUERY,
  EXPOSURE_SMB_SHARES_QUERY,
];

/**
 * Privilege Assessment Queries
 */
export const PRIVILEGE_ASSESSMENT_QUERIES: PostureQuery[] = [
  PRIVILEGE_ROOT_USERS_QUERY,
  PRIVILEGE_SUDOERS_QUERY,
  PRIVILEGE_GROUPS_QUERY,
  PRIVILEGE_USER_GROUPS_QUERY,
];

/**
 * Security Controls Queries
 */
export const SECURITY_CONTROLS_QUERIES: PostureQuery[] = [
  CONTROL_SECURITY_TOOLS_QUERY,
  CONTROL_WINDOWS_UPDATE_QUERY,
  CONTROL_MACOS_GATEKEEPER_QUERY,
  CONTROL_MACOS_XPROTECT_QUERY,
];

/**
 * Persistence Mechanism Queries
 */
export const PERSISTENCE_MECHANISM_QUERIES: PostureQuery[] = [
  PERSISTENCE_SYSTEMD_UNITS_QUERY,
  PERSISTENCE_CRONTAB_QUERY,
  PERSISTENCE_WMI_CONSUMERS_QUERY,
  PERSISTENCE_WMI_FILTERS_QUERY,
  PERSISTENCE_KERNEL_MODULES_QUERY,
  PERSISTENCE_KEXT_QUERY,
];

/**
 * Unknown Knowns (Dormant Risk) Queries
 */
export const UNKNOWN_KNOWNS_EXPANDED_QUERIES: PostureQuery[] = [
  UNKNOWN_KNOWNS_EXPIRING_CERTS_QUERY,
  UNKNOWN_KNOWNS_SERVICES_AS_SYSTEM_QUERY,
  UNKNOWN_KNOWNS_PROCESSES_AS_ROOT_QUERY,
  UNKNOWN_KNOWNS_DORMANT_ADMINS_QUERY,
  UNKNOWN_KNOWNS_SSH_KNOWN_HOSTS_QUERY,
];

/**
 * Shadow IT Detection Queries
 */
export const SHADOW_IT_QUERIES: PostureQuery[] = [
  SHADOW_IT_VPN_CLIENTS_QUERY,
  SHADOW_IT_REMOTE_ACCESS_QUERY,
  SHADOW_IT_CLOUD_CLI_QUERY,
];

/**
 * Container Awareness Queries
 */
export const CONTAINER_QUERIES: PostureQuery[] = [
  CONTAINER_DOCKER_CONTAINERS_QUERY,
  CONTAINER_DOCKER_IMAGES_QUERY,
];

/**
 * Software Inventory Queries
 */
export const SOFTWARE_INVENTORY_QUERIES: PostureQuery[] = [
  SOFTWARE_CHROME_EXTENSIONS_QUERY,
  SOFTWARE_FIREFOX_EXTENSIONS_QUERY,
  SOFTWARE_PYTHON_PACKAGES_QUERY,
  SOFTWARE_NPM_PACKAGES_QUERY,
  SOFTWARE_HOMEBREW_PACKAGES_QUERY,
];

/**
 * Get all inventory queries as a flat array
 */
export const getAllInventoryQueries = (): PostureQuery[] => [
  ...CORE_IDENTITY_QUERIES,
  ...NETWORK_EXPOSURE_QUERIES,
  ...PRIVILEGE_ASSESSMENT_QUERIES,
  ...SECURITY_CONTROLS_QUERIES,
  ...PERSISTENCE_MECHANISM_QUERIES,
  ...UNKNOWN_KNOWNS_EXPANDED_QUERIES,
  ...SHADOW_IT_QUERIES,
  ...CONTAINER_QUERIES,
  ...SOFTWARE_INVENTORY_QUERIES,
];

// =============================================================================
// PACK CONFIGURATIONS
// =============================================================================

/**
 * Core CAASM Pack - Essential asset visibility
 *
 * Minimum queries for basic CAASM functionality.
 * Recommended for all deployments.
 */
export const CORE_CAASM_PACK_CONFIG = {
  name: 'endpoint-caasm-core',
  description: 'Core CAASM queries for essential asset visibility. Includes identity, network exposure, and security controls.',
  enabled: true,
  queries: [
    ...CORE_IDENTITY_QUERIES,
    ...NETWORK_EXPOSURE_QUERIES.filter(q =>
      ['exposure_network_interfaces', 'exposure_active_connections'].includes(q.id)
    ),
    CONTROL_SECURITY_TOOLS_QUERY,
  ].reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Network Exposure Pack - Attack surface mapping
 *
 * Comprehensive network visibility queries.
 */
export const NETWORK_EXPOSURE_PACK_CONFIG = {
  name: 'endpoint-network-exposure',
  description: 'Network exposure queries for attack surface mapping. Includes interfaces, connections, routes, and shares.',
  enabled: true,
  queries: NETWORK_EXPOSURE_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Privilege Assessment Pack - Identity and access
 *
 * Queries for privilege escalation and access control visibility.
 */
export const PRIVILEGE_ASSESSMENT_PACK_CONFIG = {
  name: 'endpoint-privilege-assessment',
  description: 'Privilege assessment queries for identity and access visibility. Includes root users, sudoers, and group membership.',
  enabled: true,
  queries: PRIVILEGE_ASSESSMENT_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Unknown Knowns Pack - Dormant risk detection
 *
 * Queries for detecting forgotten access and dormant risks.
 */
export const UNKNOWN_KNOWNS_PACK_CONFIG = {
  name: 'endpoint-unknown-knowns',
  description: 'Unknown Knowns queries for dormant risk detection. Includes expiring certs, SYSTEM services, dormant admins.',
  enabled: true,
  queries: UNKNOWN_KNOWNS_EXPANDED_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Persistence Detection Pack - Malware persistence
 *
 * Queries for detecting persistence mechanisms.
 */
export const PERSISTENCE_DETECTION_PACK_CONFIG = {
  name: 'endpoint-persistence-detection',
  description: 'Persistence detection queries for malware hunting. Includes systemd, cron, WMI, and kernel modules.',
  enabled: true,
  queries: PERSISTENCE_MECHANISM_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Shadow IT Pack - Unauthorized software
 *
 * Queries for detecting shadow IT and unauthorized tools.
 */
export const SHADOW_IT_PACK_CONFIG = {
  name: 'endpoint-shadow-it',
  description: 'Shadow IT detection queries. Includes VPN clients, remote access tools, and cloud CLI.',
  enabled: true,
  queries: SHADOW_IT_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Container Awareness Pack - Docker visibility
 *
 * Queries for container environment visibility.
 */
export const CONTAINER_AWARENESS_PACK_CONFIG = {
  name: 'endpoint-container-awareness',
  description: 'Container awareness queries for Docker visibility. Includes containers and images.',
  enabled: true,
  queries: CONTAINER_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Software Supply Chain Pack - Package visibility
 *
 * Queries for software supply chain visibility.
 */
export const SOFTWARE_SUPPLY_CHAIN_PACK_CONFIG = {
  name: 'endpoint-software-supply-chain',
  description: 'Software supply chain queries. Includes browser extensions, Python, npm, and Homebrew packages.',
  enabled: true,
  queries: SOFTWARE_INVENTORY_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * Full CAASM Pack - All queries
 *
 * Complete CAASM query collection for maximum visibility.
 * Use with caution - high query volume.
 */
export const FULL_CAASM_PACK_CONFIG = {
  name: 'endpoint-caasm-full',
  description: 'Complete CAASM query collection for maximum asset visibility. Includes all categories.',
  enabled: true,
  queries: getAllInventoryQueries().reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};

/**
 * All pack configurations
 */
export const ALL_INVENTORY_PACKS = {
  coreCaasm: CORE_CAASM_PACK_CONFIG,
  networkExposure: NETWORK_EXPOSURE_PACK_CONFIG,
  privilegeAssessment: PRIVILEGE_ASSESSMENT_PACK_CONFIG,
  unknownKnowns: UNKNOWN_KNOWNS_PACK_CONFIG,
  persistenceDetection: PERSISTENCE_DETECTION_PACK_CONFIG,
  shadowIt: SHADOW_IT_PACK_CONFIG,
  containerAwareness: CONTAINER_AWARENESS_PACK_CONFIG,
  softwareSupplyChain: SOFTWARE_SUPPLY_CHAIN_PACK_CONFIG,
  fullCaasm: FULL_CAASM_PACK_CONFIG,
} as const;
