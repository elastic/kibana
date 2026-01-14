/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Osquery Saved Queries for Endpoint Asset Drift Detection
 *
 * These queries use osquery's differential mode to track security-relevant
 * changes across five categories: privileges, persistence, network, software, and posture.
 *
 * Differential Query Modes:
 * - adds+removes: snapshot=false, removed=true (privileges, persistence)
 * - ignore removals: snapshot=false, removed=false (network, software)
 * - snapshot: snapshot=true, removed=false (posture - daily comparison)
 *
 * To use these queries:
 * 1. Create an osquery pack with these queries via Kibana UI or API
 * 2. Assign the pack to your endpoints via Fleet
 * 3. The drift transform will extract changes into endpoint-drift-events-* index
 * 4. Entity aggregation will roll up drift stats to endpoint.drift fields
 */

export interface DriftQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  platform: 'windows' | 'linux' | 'darwin' | 'posix' | 'all';
  interval: number;
  snapshot: boolean;
  removed: boolean;
  category: 'privileges' | 'persistence' | 'network' | 'software' | 'posture';
  ecsMapping: Record<string, { field: string }>;
}

// =============================================================================
// PRIVILEGES DRIFT QUERIES (Differential: adds+removes)
// =============================================================================

/**
 * Drift - Privileges - Local Admins
 *
 * Tracks additions and removals of users in administrative groups.
 * Security value: Detects privilege escalation or unauthorized admin access.
 */
export const DRIFT_PRIVILEGES_LOCAL_ADMINS: DriftQuery = {
  id: 'drift_privileges_local_admins',
  name: 'Drift – Privileges – Local Admins',
  description: 'Track changes to local administrator group membership',
  query: `
SELECT
  u.username,
  ug.groupname,
  u.uid,
  u.gid
FROM users u
JOIN user_groups ug ON u.uid = ug.uid
JOIN groups g ON ug.gid = g.gid
WHERE g.groupname IN ('Administrators', 'admin', 'sudo', 'wheel');
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.groupname': { field: 'groupname' },
    'osquery.uid': { field: 'uid' },
  },
};

/**
 * Drift - Privileges - Users
 *
 * Tracks all user account additions and removals.
 * Security value: Detects unauthorized account creation or suspicious deletions.
 */
export const DRIFT_PRIVILEGES_USERS: DriftQuery = {
  id: 'drift_privileges_users',
  name: 'Drift – Privileges – Users',
  description: 'Track changes to user accounts',
  query: `
SELECT
  username,
  uid,
  gid,
  shell,
  directory
FROM users;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.uid': { field: 'uid' },
    'osquery.shell': { field: 'shell' },
  },
};

/**
 * Drift - Privileges - Privileged Group Membership
 *
 * Tracks additions/removals of users in other privileged groups beyond sudo/admin.
 * Security value: catches escalation via docker/lxd/adm and similar groups.
 */
export const DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP: DriftQuery = {
  id: 'drift_privileges_privileged_group_membership',
  name: 'Drift – Privileges – Privileged Group Membership',
  description: 'Track changes to membership in privileged groups (docker/lxd/adm/etc)',
  query: `
SELECT
  u.username,
  ug.groupname,
  u.uid,
  u.gid
FROM users u
JOIN user_groups ug ON u.uid = ug.uid
JOIN groups g ON ug.gid = g.gid
WHERE g.groupname IN ('docker', 'lxd', 'adm', 'systemd-journal', 'lpadmin');
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.groupname': { field: 'groupname' },
    'osquery.uid': { field: 'uid' },
  },
};

/**
 * Drift - Privileges - Sudoers Rules
 *
 * Tracks sudoers rule changes.
 * Security value: detects newly introduced NOPASSWD / ALL rules and other privilege expansions.
 */
export const DRIFT_PRIVILEGES_SUDOERS_RULES: DriftQuery = {
  id: 'drift_privileges_sudoers_rules',
  name: 'Drift – Privileges – Sudoers Rules',
  description: 'Track changes to sudoers rules',
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
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.sudoers_source': { field: 'source' },
    'osquery.sudoers_header': { field: 'header' },
    'osquery.sudoers_rule': { field: 'rule_details' },
    'osquery.sudoers_nopasswd': { field: 'nopasswd_enabled' },
    'osquery.sudoers_all_commands': { field: 'all_commands' },
  },
};

// =============================================================================
// PERSISTENCE DRIFT QUERIES (Differential: adds+removes)
// =============================================================================

/**
 * Drift - Persistence - Services Windows
 *
 * Tracks Windows service additions, removals, and status changes.
 * Security value: Detects malware persistence via service installation.
 */
export const DRIFT_PERSISTENCE_SERVICES_WINDOWS: DriftQuery = {
  id: 'drift_persistence_services_windows',
  name: 'Drift – Persistence – Services Windows',
  description: 'Track changes to Windows services',
  query: `
SELECT
  name,
  display_name,
  path,
  start_type,
  status
FROM services;
  `.trim(),
  platform: 'windows',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.service_name': { field: 'name' },
    'osquery.service_path': { field: 'path' },
    'osquery.start_type': { field: 'start_type' },
    'osquery.status': { field: 'status' },
  },
};

/**
 * Drift - Persistence - Startup Items
 *
 * Tracks startup items across all platforms.
 * Security value: Detects persistence mechanisms via startup/login items.
 */
export const DRIFT_PERSISTENCE_STARTUP_ITEMS: DriftQuery = {
  id: 'drift_persistence_startup_items',
  name: 'Drift – Persistence – Startup Items',
  description: 'Track changes to startup items',
  query: `
SELECT
  name,
  path,
  source,
  status,
  username
FROM startup_items;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.startup_name': { field: 'name' },
    'osquery.startup_path': { field: 'path' },
    'osquery.startup_source': { field: 'source' },
  },
};

/**
 * Drift - Persistence - Systemd Custom Units (Linux)
 *
 * Tracks new/removed custom systemd units (outside standard system paths).
 * Security value: catches persistence via dropped-in services/timers.
 */
export const DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS: DriftQuery = {
  id: 'drift_persistence_systemd_custom_units',
  name: 'Drift – Persistence – Systemd Custom Units',
  description: 'Track changes to custom systemd service/timer units',
  query: `
SELECT
  id AS name,
  fragment_path AS path,
  active_state AS status,
  sub_state,
  load_state,
  CASE
    WHEN id LIKE '%.timer' THEN 'timer'
    WHEN id LIKE '%.service' THEN 'service'
    ELSE 'other'
  END AS unit_type,
  'systemd' AS source
FROM systemd_units
WHERE active_state = 'active'
  AND (id LIKE '%.timer' OR id LIKE '%.service')
  AND fragment_path NOT LIKE '/usr/lib/systemd%'
  AND fragment_path NOT LIKE '/lib/systemd%'
  AND fragment_path NOT LIKE '/run/systemd%';
  `.trim(),
  platform: 'linux',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.name': { field: 'name' },
    'osquery.path': { field: 'path' },
    'osquery.source': { field: 'source' },
    'osquery.status': { field: 'status' },
  },
};

/**
 * Drift - Persistence - External Cron Jobs (Linux/macOS)
 *
 * Tracks cron jobs that call external URLs.
 * Security value: catches persistence/C2 via curl/wget + URL patterns.
 */
export const DRIFT_PERSISTENCE_CRON_EXTERNAL: DriftQuery = {
  id: 'drift_persistence_cron_external',
  name: 'Drift – Persistence – Cron Jobs (External)',
  description: 'Track changes to cron jobs that call external URLs',
  query: `
SELECT
  command AS name,
  path,
  'crontab' AS source,
  CASE
    WHEN command LIKE '%http://%' OR command LIKE '%https://%'
      OR command LIKE '%curl %' OR command LIKE '%wget %'
    THEN '1'
    ELSE '0'
  END AS calls_external
FROM crontab
WHERE command LIKE '%http://%' OR command LIKE '%https://%'
   OR command LIKE '%curl %' OR command LIKE '%wget %';
  `.trim(),
  platform: 'linux,darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.name': { field: 'name' },
    'osquery.path': { field: 'path' },
    'osquery.source': { field: 'source' },
    'osquery.calls_external': { field: 'calls_external' },
  },
};

/**
 * Drift - Persistence - Unusual Kernel Modules (Linux)
 *
 * Tracks additions/removals of unusual loaded kernel modules.
 * Security value: rootkits often rely on non-standard modules.
 */
export const DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES: DriftQuery = {
  id: 'drift_persistence_unusual_kernel_modules',
  name: 'Drift – Persistence – Unusual Kernel Modules',
  description: 'Track changes to unusual loaded kernel modules',
  query: `
SELECT
  name AS name,
  used_by,
  status,
  address,
  'kernel_module' AS source
FROM kernel_modules
WHERE name NOT IN ('ext4', 'xfs', 'btrfs', 'nfs', 'nfsv4', 'cifs', 'fuse', 'overlay',
                  'iptable_filter', 'iptable_nat', 'nf_conntrack', 'nf_nat', 'nf_tables',
                  'bridge', 'br_netfilter', 'veth', 'tun', 'tap', 'vxlan',
                  'kvm', 'kvm_intel', 'kvm_amd', 'virtio', 'virtio_pci', 'virtio_net',
                  'nvidia', 'amdgpu', 'i915', 'nouveau', 'drm',
                  'usb_storage', 'usbhid', 'hid_generic',
                  'snd', 'snd_hda_intel', 'snd_hda_codec', 'soundcore',
                  'bluetooth', 'btusb', 'rfkill',
                  'dm_crypt', 'dm_mod', 'dm_multipath',
                  'loop', 'sr_mod', 'cdrom', 'sg');
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.name': { field: 'name' },
    'osquery.source': { field: 'source' },
    'osquery.status': { field: 'status' },
  },
};

/**
 * Drift - Persistence - Scheduled Tasks
 *
 * Tracks Windows scheduled task additions and removals.
 * Security value: Detects persistence and lateral movement via scheduled tasks.
 */
export const DRIFT_PERSISTENCE_SCHEDULED_TASKS: DriftQuery = {
  id: 'drift_persistence_scheduled_tasks',
  name: 'Drift – Persistence – Scheduled Tasks',
  description: 'Track changes to Windows scheduled tasks',
  query: `
SELECT
  name,
  action,
  enabled,
  path,
  hidden
FROM scheduled_tasks;
  `.trim(),
  platform: 'windows',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.task_name': { field: 'name' },
    'osquery.task_action': { field: 'action' },
    'osquery.task_enabled': { field: 'enabled' },
    'osquery.task_path': { field: 'path' },
  },
};

/**
 * Drift - Persistence - Launchd
 *
 * Tracks macOS launchd daemon/agent additions and removals.
 * Security value: Detects persistence on macOS via launchd.
 */
export const DRIFT_PERSISTENCE_LAUNCHD: DriftQuery = {
  id: 'drift_persistence_launchd',
  name: 'Drift – Persistence – Launchd',
  description: 'Track changes to macOS launchd items',
  query: `
SELECT
  label,
  name,
  path,
  program,
  program_arguments,
  run_at_load
FROM launchd;
  `.trim(),
  platform: 'darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.launchd_label': { field: 'label' },
    'osquery.launchd_program': { field: 'program' },
    'osquery.launchd_path': { field: 'path' },
  },
};

// =============================================================================
// NETWORK DRIFT QUERIES (Differential: ignore removals)
// =============================================================================

/**
 * Drift - Network - Listening Ports
 *
 * Tracks new listening ports (ignores port closures).
 * Security value: Detects new attack surface from unexpected network listeners.
 */
export const DRIFT_NETWORK_LISTENING_PORTS: DriftQuery = {
  id: 'drift_network_listening_ports',
  name: 'Drift – Network – Listening Ports',
  description: 'Track new listening ports (ignore closures)',
  query: `
SELECT
  p.port,
  p.protocol,
  p.address,
  p.pid,
  pr.name AS process_name,
  pr.path AS process_path
FROM listening_ports p
LEFT JOIN processes pr ON p.pid = pr.pid
WHERE p.address != '127.0.0.1' AND p.address != '::1';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 900,
  snapshot: false,
  removed: false,
  category: 'network',
  ecsMapping: {
    'osquery.port': { field: 'port' },
    'osquery.protocol': { field: 'protocol' },
    'osquery.address': { field: 'address' },
    'osquery.process_name': { field: 'process_name' },
  },
};

/**
 * Drift - Network - Custom SMB Shares (Windows)
 *
 * Tracks additions/removals of custom SMB shares.
 * Security value: newly exposed shares can expand lateral movement paths.
 */
export const DRIFT_NETWORK_CUSTOM_SMB_SHARES: DriftQuery = {
  id: 'drift_network_custom_smb_shares',
  name: 'Drift – Network – Custom SMB Shares',
  description: 'Track changes to custom SMB shares',
  query: `
SELECT
  name AS share_name,
  path AS share_path,
  description,
  'smb_share' AS share_type
FROM shared_resources
WHERE name NOT IN ('ADMIN$', 'C$', 'IPC$')
  AND path != ''
  AND path IS NOT NULL;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.share_name': { field: 'share_name' },
    'osquery.share_path': { field: 'share_path' },
    'osquery.share_type': { field: 'share_type' },
  },
};

// =============================================================================
// SOFTWARE DRIFT QUERIES (Differential: ignore removals)
// =============================================================================

/**
 * Drift - Software - Programs Windows
 *
 * Tracks new Windows program installations (ignores uninstalls).
 * Security value: Detects unauthorized software installations.
 */
export const DRIFT_SOFTWARE_PROGRAMS_WINDOWS: DriftQuery = {
  id: 'drift_software_programs_windows',
  name: 'Drift – Software – Programs Windows',
  description: 'Track new Windows program installations',
  query: `
SELECT
  name,
  version,
  publisher,
  install_date,
  install_location
FROM programs;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.program_name': { field: 'name' },
    'osquery.program_version': { field: 'version' },
    'osquery.publisher': { field: 'publisher' },
  },
};

/**
 * Drift - Software - Deb Packages
 *
 * Tracks new Debian package installations (ignores removals).
 * Security value: Detects unauthorized software on Debian/Ubuntu systems.
 */
export const DRIFT_SOFTWARE_DEB: DriftQuery = {
  id: 'drift_software_deb',
  name: 'Drift – Software – Deb Packages',
  description: 'Track new Debian package installations',
  query: `
SELECT
  name,
  version,
  source,
  size,
  arch,
  maintainer
FROM deb_packages;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.package_name': { field: 'name' },
    'osquery.package_version': { field: 'version' },
    'osquery.maintainer': { field: 'maintainer' },
  },
};

/**
 * Drift - Software - RPM Packages
 *
 * Tracks new RPM package installations (ignores removals).
 * Security value: Detects unauthorized software on RHEL/CentOS/Fedora systems.
 */
export const DRIFT_SOFTWARE_RPM: DriftQuery = {
  id: 'drift_software_rpm',
  name: 'Drift – Software – RPM Packages',
  description: 'Track new RPM package installations',
  query: `
SELECT
  name,
  version,
  release,
  source,
  size,
  arch,
  vendor
FROM rpm_packages;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.package_name': { field: 'name' },
    'osquery.package_version': { field: 'version' },
    'osquery.vendor': { field: 'vendor' },
  },
};

/**
 * Drift - Software - Apps macOS
 *
 * Tracks new macOS application installations (ignores removals).
 * Security value: Detects unauthorized software on macOS systems.
 */
export const DRIFT_SOFTWARE_APPS_MACOS: DriftQuery = {
  id: 'drift_software_apps_macos',
  name: 'Drift – Software – Apps macOS',
  description: 'Track new macOS application installations',
  query: `
SELECT
  name,
  path,
  bundle_identifier,
  bundle_short_version,
  bundle_version,
  category
FROM apps;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.app_name': { field: 'name' },
    'osquery.app_path': { field: 'path' },
    'osquery.bundle_id': { field: 'bundle_identifier' },
    'osquery.version': { field: 'bundle_short_version' },
  },
};

/**
 * Drift - Software - Browser Extensions (Chrome)
 *
 * Tracks new Chrome extensions.
 * Security value: catches new extensions which can exfiltrate data or inject scripts.
 */
export const DRIFT_SOFTWARE_CHROME_EXTENSIONS: DriftQuery = {
  id: 'drift_software_chrome_extensions',
  name: 'Drift – Software – Chrome Extensions',
  description: 'Track new Chrome extensions (ignore removals)',
  query: `
SELECT
  name,
  version,
  identifier,
  update_url,
  path
FROM chrome_extensions;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.name': { field: 'name' },
    'osquery.version': { field: 'version' },
    'osquery.identifier': { field: 'identifier' },
  },
};

/**
 * Drift - Software - Browser Add-ons (Firefox)
 *
 * Tracks new Firefox add-ons.
 */
export const DRIFT_SOFTWARE_FIREFOX_ADDONS: DriftQuery = {
  id: 'drift_software_firefox_addons',
  name: 'Drift – Software – Firefox Add-ons',
  description: 'Track new Firefox add-ons (ignore removals)',
  query: `
SELECT
  name,
  version,
  identifier,
  creator,
  location
FROM firefox_addons;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.name': { field: 'name' },
    'osquery.version': { field: 'version' },
    'osquery.identifier': { field: 'identifier' },
  },
};

// =============================================================================
// POSTURE DRIFT QUERIES (Snapshot: daily comparison)
// =============================================================================

/**
 * Drift - Posture - Disk Encryption
 *
 * Daily snapshot of disk encryption status for comparison.
 * Security value: Detects when disk encryption is disabled (security regression).
 */
export const DRIFT_POSTURE_DISK_ENCRYPTION: DriftQuery = {
  id: 'drift_posture_disk_encryption',
  name: 'Drift – Posture – Disk Encryption',
  description: 'Daily snapshot of disk encryption status',
  query: `
SELECT
  encrypted,
  type,
  name,
  uid
FROM disk_encryption;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 86400,
  snapshot: true,
  removed: false,
  category: 'posture',
  ecsMapping: {
    'osquery.encrypted': { field: 'encrypted' },
    'osquery.type': { field: 'type' },
    'osquery.name': { field: 'name' },
  },
};

/**
 * Drift - Posture - Firewall Linux (Snapshot)
 *
 * Daily snapshot of Linux iptables posture (configured vs wide-open).
 */
export const DRIFT_POSTURE_FIREWALL_LINUX: DriftQuery = {
  id: 'drift_posture_firewall_linux',
  name: 'Drift – Posture – Firewall Linux',
  description: 'Daily snapshot of Linux firewall status',
  query: `
SELECT
  COUNT(*) AS rule_count,
  CASE
    WHEN COUNT(*) > 0 THEN '1'
    ELSE '0'
  END AS firewall_enabled
FROM iptables
WHERE chain IN ('INPUT', 'OUTPUT', 'FORWARD')
  AND policy NOT IN ('ACCEPT');
  `.trim(),
  platform: 'linux',
  interval: 86400,
  snapshot: true,
  removed: false,
  category: 'posture',
  ecsMapping: {
    'osquery.firewall_enabled': { field: 'firewall_enabled' },
    'osquery.rule_count': { field: 'rule_count' },
  },
};

/**
 * Drift - Posture - Firewall macOS
 *
 * Daily snapshot of macOS Application Layer Firewall status.
 * Security value: Detects when firewall is disabled on macOS.
 */
export const DRIFT_POSTURE_FIREWALL_MACOS: DriftQuery = {
  id: 'drift_posture_firewall_macos',
  name: 'Drift – Posture – Firewall macOS',
  description: 'Daily snapshot of macOS firewall status',
  query: `
SELECT
  global_state,
  logging_enabled,
  stealth_enabled,
  firewall_unload
FROM alf;
  `.trim(),
  platform: 'darwin',
  interval: 86400,
  snapshot: true,
  removed: false,
  category: 'posture',
  ecsMapping: {
    'osquery.global_state': { field: 'global_state' },
    'osquery.firewall_unload': { field: 'firewall_unload' },
  },
};

/**
 * Drift - Posture - Firewall Windows
 *
 * Daily snapshot of active Windows firewall rules.
 * Security value: Detects changes to firewall configuration.
 */
export const DRIFT_POSTURE_FIREWALL_WINDOWS: DriftQuery = {
  id: 'drift_posture_firewall_windows',
  name: 'Drift – Posture – Firewall Windows',
  description: 'Daily snapshot of active Windows firewall rules',
  query: `
SELECT
  name,
  direction,
  action,
  enabled,
  protocol,
  local_ports,
  remote_ports
FROM windows_firewall_rules
WHERE enabled = 1;
  `.trim(),
  platform: 'windows',
  interval: 86400,
  snapshot: true,
  removed: false,
  category: 'posture',
  ecsMapping: {
    'osquery.firewall_rule_name': { field: 'name' },
    'osquery.direction': { field: 'direction' },
    'osquery.action': { field: 'action' },
    'osquery.enabled': { field: 'enabled' },
  },
};

/**
 * Drift - Posture - Secure Boot
 *
 * Daily snapshot of Secure Boot status (Windows/Linux).
 * Security value: Detects when Secure Boot is disabled.
 */
export const DRIFT_POSTURE_SECURE_BOOT: DriftQuery = {
  id: 'drift_posture_secure_boot',
  name: 'Drift – Posture – Secure Boot',
  description: 'Daily snapshot of Secure Boot status',
  query: `
SELECT
  secure_boot,
  setup_mode
FROM secureboot;
  `.trim(),
  platform: 'windows',
  interval: 86400,
  snapshot: true,
  removed: false,
  category: 'posture',
  ecsMapping: {
    'osquery.secure_boot': { field: 'secure_boot' },
    'osquery.setup_mode': { field: 'setup_mode' },
  },
};

// =============================================================================
// QUERY GROUPING & EXPORTS
// =============================================================================

/**
 * All drift queries grouped by category
 */
export const DRIFT_QUERIES = {
  privileges: {
    localAdmins: DRIFT_PRIVILEGES_LOCAL_ADMINS,
    users: DRIFT_PRIVILEGES_USERS,
    privilegedGroupMembership: DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
    sudoersRules: DRIFT_PRIVILEGES_SUDOERS_RULES,
  },
  persistence: {
    servicesWindows: DRIFT_PERSISTENCE_SERVICES_WINDOWS,
    startupItems: DRIFT_PERSISTENCE_STARTUP_ITEMS,
    systemdCustomUnits: DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS,
    cronExternal: DRIFT_PERSISTENCE_CRON_EXTERNAL,
    scheduledTasks: DRIFT_PERSISTENCE_SCHEDULED_TASKS,
    launchd: DRIFT_PERSISTENCE_LAUNCHD,
    unusualKernelModules: DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES,
  },
  network: {
    listeningPorts: DRIFT_NETWORK_LISTENING_PORTS,
    customSmbShares: DRIFT_NETWORK_CUSTOM_SMB_SHARES,
  },
  software: {
    programsWindows: DRIFT_SOFTWARE_PROGRAMS_WINDOWS,
    debPackages: DRIFT_SOFTWARE_DEB,
    rpmPackages: DRIFT_SOFTWARE_RPM,
    appsMacOS: DRIFT_SOFTWARE_APPS_MACOS,
    chromeExtensions: DRIFT_SOFTWARE_CHROME_EXTENSIONS,
    firefoxAddons: DRIFT_SOFTWARE_FIREFOX_ADDONS,
  },
  posture: {
    diskEncryption: DRIFT_POSTURE_DISK_ENCRYPTION,
    firewallMacOS: DRIFT_POSTURE_FIREWALL_MACOS,
    firewallLinux: DRIFT_POSTURE_FIREWALL_LINUX,
    firewallWindows: DRIFT_POSTURE_FIREWALL_WINDOWS,
    secureBoot: DRIFT_POSTURE_SECURE_BOOT,
  },
} as const;

/**
 * Get all drift queries as a flat array
 */
export const getAllDriftQueries = (): DriftQuery[] => [
  DRIFT_PRIVILEGES_LOCAL_ADMINS,
  DRIFT_PRIVILEGES_USERS,
  DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
  DRIFT_PRIVILEGES_SUDOERS_RULES,
  DRIFT_PERSISTENCE_SERVICES_WINDOWS,
  DRIFT_PERSISTENCE_STARTUP_ITEMS,
  DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS,
  DRIFT_PERSISTENCE_CRON_EXTERNAL,
  DRIFT_PERSISTENCE_SCHEDULED_TASKS,
  DRIFT_PERSISTENCE_LAUNCHD,
  DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES,
  DRIFT_NETWORK_LISTENING_PORTS,
  DRIFT_NETWORK_CUSTOM_SMB_SHARES,
  DRIFT_SOFTWARE_PROGRAMS_WINDOWS,
  DRIFT_SOFTWARE_DEB,
  DRIFT_SOFTWARE_RPM,
  DRIFT_SOFTWARE_APPS_MACOS,
  DRIFT_SOFTWARE_CHROME_EXTENSIONS,
  DRIFT_SOFTWARE_FIREFOX_ADDONS,
  DRIFT_POSTURE_DISK_ENCRYPTION,
  DRIFT_POSTURE_FIREWALL_LINUX,
  DRIFT_POSTURE_FIREWALL_MACOS,
  DRIFT_POSTURE_FIREWALL_WINDOWS,
  DRIFT_POSTURE_SECURE_BOOT,
];

/**
 * Get drift queries for a specific platform
 */
export const getDriftQueriesForPlatform = (
  platform: 'windows' | 'linux' | 'darwin'
): DriftQuery[] => {
  const queries: DriftQuery[] = [];

  if (platform === 'windows') {
    queries.push(
      DRIFT_PRIVILEGES_LOCAL_ADMINS,
      DRIFT_PRIVILEGES_USERS,
      DRIFT_PRIVILEGES_SUDOERS_RULES,
      DRIFT_PERSISTENCE_SERVICES_WINDOWS,
      DRIFT_PERSISTENCE_STARTUP_ITEMS,
      DRIFT_PERSISTENCE_SCHEDULED_TASKS,
      DRIFT_NETWORK_LISTENING_PORTS,
      DRIFT_NETWORK_CUSTOM_SMB_SHARES,
      DRIFT_SOFTWARE_PROGRAMS_WINDOWS,
      DRIFT_SOFTWARE_CHROME_EXTENSIONS,
      DRIFT_SOFTWARE_FIREFOX_ADDONS,
      DRIFT_POSTURE_DISK_ENCRYPTION,
      DRIFT_POSTURE_FIREWALL_WINDOWS,
      DRIFT_POSTURE_SECURE_BOOT
    );
  } else if (platform === 'linux') {
    queries.push(
      DRIFT_PRIVILEGES_LOCAL_ADMINS,
      DRIFT_PRIVILEGES_USERS,
      DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
      DRIFT_PRIVILEGES_SUDOERS_RULES,
      DRIFT_PERSISTENCE_STARTUP_ITEMS,
      DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS,
      DRIFT_PERSISTENCE_CRON_EXTERNAL,
      DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES,
      DRIFT_NETWORK_LISTENING_PORTS,
      DRIFT_SOFTWARE_DEB,
      DRIFT_SOFTWARE_RPM,
      DRIFT_SOFTWARE_CHROME_EXTENSIONS,
      DRIFT_SOFTWARE_FIREFOX_ADDONS,
      DRIFT_POSTURE_DISK_ENCRYPTION,
      DRIFT_POSTURE_FIREWALL_LINUX
    );
  } else if (platform === 'darwin') {
    queries.push(
      DRIFT_PRIVILEGES_LOCAL_ADMINS,
      DRIFT_PRIVILEGES_USERS,
      DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
      DRIFT_PRIVILEGES_SUDOERS_RULES,
      DRIFT_PERSISTENCE_STARTUP_ITEMS,
      DRIFT_PERSISTENCE_CRON_EXTERNAL,
      DRIFT_PERSISTENCE_LAUNCHD,
      DRIFT_NETWORK_LISTENING_PORTS,
      DRIFT_SOFTWARE_APPS_MACOS,
      DRIFT_SOFTWARE_CHROME_EXTENSIONS,
      DRIFT_SOFTWARE_FIREFOX_ADDONS,
      DRIFT_POSTURE_DISK_ENCRYPTION,
      DRIFT_POSTURE_FIREWALL_MACOS
    );
  }

  return queries;
};

/**
 * Get queries by category
 */
export const getDriftQueriesByCategory = (
  category: 'privileges' | 'persistence' | 'network' | 'software' | 'posture'
): DriftQuery[] => {
  return getAllDriftQueries().filter((query) => query.category === category);
};

/**
 * Example pack configuration for creating an osquery pack via API
 *
 * POST /api/osquery/packs
 * {
 *   "name": "endpoint-drift-detection",
 *   "description": "Drift detection queries for Endpoint Asset Management",
 *   "enabled": true,
 *   "queries": { ... }
 * }
 */
export const DRIFT_PACK_CONFIG = {
  name: 'endpoint-drift-detection',
  description:
    'Drift detection queries for Endpoint Asset Management. Tracks security-relevant changes across privileges, persistence, network, software, and posture.',
  enabled: true,
  queries: getAllDriftQueries().reduce(
    (acc, query) => {
      acc[query.id] = {
        query: query.query,
        interval: query.interval,
        platform: query.platform,
        snapshot: query.snapshot,
        removed: query.removed,
        ecs_mapping: query.ecsMapping,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        query: string;
        interval: number;
        platform: string;
        snapshot: boolean;
        removed: boolean;
        ecs_mapping: Record<string, { field: string }>;
      }
    >
  ),
};
