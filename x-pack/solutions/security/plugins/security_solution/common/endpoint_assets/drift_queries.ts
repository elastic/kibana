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
  category: 'privileges' | 'persistence' | 'network' | 'software' | 'posture' | 'certificates' | 'hardware' | 'runtime';
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

/**
 * Drift - Privileges - SSH Authorized Keys
 *
 * Tracks additions and removals of SSH authorized keys.
 * Security value: Detects unauthorized SSH key additions for persistent access.
 */
export const DRIFT_PRIVILEGES_SSH_AUTHORIZED_KEYS: DriftQuery = {
  id: 'drift_privileges_ssh_authorized_keys',
  name: 'Drift – Privileges – SSH Authorized Keys',
  description: 'Track changes to SSH authorized keys',
  query: `
SELECT
  uid,
  algorithm,
  key,
  key_file,
  comment
FROM authorized_keys;
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.uid': { field: 'uid' },
    'osquery.ssh_algorithm': { field: 'algorithm' },
    'osquery.ssh_key': { field: 'key' },
    'osquery.ssh_key_file': { field: 'key_file' },
    'osquery.ssh_key_comment': { field: 'comment' },
  },
};

/**
 * Drift - Privileges - SUID Binaries
 *
 * Tracks SUID/SGID binaries outside standard system paths.
 * Security value: Detects privilege escalation vectors via setuid binaries.
 */
export const DRIFT_PRIVILEGES_SUID_BINARIES: DriftQuery = {
  id: 'drift_privileges_suid_binaries',
  name: 'Drift – Privileges – SUID Binaries',
  description: 'Track changes to SUID/SGID binaries outside standard paths',
  query: `
SELECT
  path,
  username,
  groupname,
  permissions
FROM suid_bin
WHERE path NOT LIKE '/usr/bin/%'
  AND path NOT LIKE '/usr/sbin/%'
  AND path NOT LIKE '/bin/%'
  AND path NOT LIKE '/sbin/%'
  AND path NOT LIKE '/usr/lib/%'
  AND path NOT LIKE '/usr/libexec/%';
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.suid_path': { field: 'path' },
    'osquery.suid_username': { field: 'username' },
    'osquery.suid_groupname': { field: 'groupname' },
    'osquery.suid_permissions': { field: 'permissions' },
  },
};

/**
 * Drift - Privileges - Active Sessions
 *
 * Tracks logged in users and active sessions.
 * Security value: Detects unauthorized access and lateral movement.
 */
export const DRIFT_PRIVILEGES_ACTIVE_SESSIONS: DriftQuery = {
  id: 'drift_privileges_active_sessions',
  name: 'Drift – Privileges – Active Sessions',
  description: 'Track logged in users and active sessions',
  query: `
SELECT
  type,
  user,
  tty,
  host,
  pid
FROM logged_in_users
WHERE type = 'user';
  `.trim(),
  platform: 'linux,darwin',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.session_type': { field: 'type' },
    'osquery.session_user': { field: 'user' },
    'osquery.session_tty': { field: 'tty' },
    'osquery.session_host': { field: 'host' },
    'osquery.session_pid': { field: 'pid' },
  },
};

/**
 * Drift - Privileges - Windows Logon Sessions
 *
 * Tracks active Windows logon sessions.
 * Security value: Detects unauthorized access and lateral movement on Windows.
 */
export const DRIFT_PRIVILEGES_LOGON_SESSIONS_WINDOWS: DriftQuery = {
  id: 'drift_privileges_logon_sessions_windows',
  name: 'Drift – Privileges – Logon Sessions Windows',
  description: 'Track active Windows logon sessions',
  query: `
SELECT
  logon_id,
  user,
  logon_domain,
  authentication_package,
  logon_type,
  logon_server
FROM logon_sessions
WHERE logon_type != '0';
  `.trim(),
  platform: 'windows',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.logon_id': { field: 'logon_id' },
    'osquery.logon_user': { field: 'user' },
    'osquery.logon_domain': { field: 'logon_domain' },
    'osquery.logon_auth_package': { field: 'authentication_package' },
    'osquery.logon_type': { field: 'logon_type' },
  },
};

/**
 * Drift - Privileges - Cloud Credentials
 *
 * Tracks presence of cloud provider credential files.
 * Security value: Detects cloud access keys that could be exfiltrated.
 */
export const DRIFT_PRIVILEGES_CLOUD_CREDENTIALS: DriftQuery = {
  id: 'drift_privileges_cloud_credentials',
  name: 'Drift – Privileges – Cloud Credentials',
  description: 'Track presence of cloud provider credential files',
  query: `
SELECT
  path,
  filename,
  size,
  mtime,
  uid
FROM file
WHERE (
  path LIKE '%/.aws/credentials'
  OR path LIKE '%/.aws/config'
  OR path LIKE '%/.azure/accessTokens.json'
  OR path LIKE '%/.azure/azureProfile.json'
  OR path LIKE '%/.config/gcloud/credentials.db'
  OR path LIKE '%/.config/gcloud/access_tokens.db'
  OR path LIKE '%/.kube/config'
);
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.cloud_cred_path': { field: 'path' },
    'osquery.cloud_cred_filename': { field: 'filename' },
    'osquery.cloud_cred_size': { field: 'size' },
    'osquery.cloud_cred_mtime': { field: 'mtime' },
  },
};

/**
 * Drift - Privileges - User SSH Keys
 *
 * Tracks user SSH private keys (inventory of keys that could be stolen).
 * Security value: Identifies private keys that could be exfiltrated for lateral movement.
 */
export const DRIFT_PRIVILEGES_USER_SSH_KEYS: DriftQuery = {
  id: 'drift_privileges_user_ssh_keys',
  name: 'Drift – Privileges – User SSH Keys',
  description: 'Track user SSH private keys',
  query: `
SELECT
  uid,
  path,
  encrypted
FROM user_ssh_keys;
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.uid': { field: 'uid' },
    'osquery.ssh_key_path': { field: 'path' },
    'osquery.ssh_key_encrypted': { field: 'encrypted' },
  },
};

/**
 * Drift - Privileges - Windows Local Groups
 *
 * Tracks all Windows local groups and membership.
 * Security value: Detects group creation and privilege assignment changes.
 */
export const DRIFT_PRIVILEGES_WINDOWS_GROUPS: DriftQuery = {
  id: 'drift_privileges_windows_groups',
  name: 'Drift – Privileges – Windows Groups',
  description: 'Track Windows local groups',
  query: `
SELECT
  gid,
  groupname,
  group_sid,
  comment
FROM groups;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.gid': { field: 'gid' },
    'osquery.groupname': { field: 'groupname' },
    'osquery.group_sid': { field: 'group_sid' },
  },
};

/**
 * Drift - Privileges - Windows User Groups
 *
 * Tracks Windows user group membership.
 * Security value: Detects privilege escalation via group membership changes.
 */
export const DRIFT_PRIVILEGES_WINDOWS_USER_GROUPS: DriftQuery = {
  id: 'drift_privileges_windows_user_groups',
  name: 'Drift – Privileges – Windows User Groups',
  description: 'Track Windows user group membership',
  query: `
SELECT
  u.username,
  ug.groupname,
  u.uid,
  g.group_sid
FROM users u
JOIN user_groups ug ON u.uid = ug.uid
JOIN groups g ON ug.gid = g.gid;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.groupname': { field: 'groupname' },
    'osquery.uid': { field: 'uid' },
    'osquery.group_sid': { field: 'group_sid' },
  },
};

/**
 * Drift - Privileges - Shared User Accounts
 *
 * Tracks accounts with shared or default shells that might indicate service accounts.
 * Security value: Identifies accounts that could be misused for persistence.
 */
export const DRIFT_PRIVILEGES_SHARED_ACCOUNTS: DriftQuery = {
  id: 'drift_privileges_shared_accounts',
  name: 'Drift – Privileges – Shared Accounts',
  description: 'Track shared or service accounts',
  query: `
SELECT
  username,
  uid,
  gid,
  shell,
  directory,
  description
FROM users
WHERE shell NOT IN ('/usr/sbin/nologin', '/bin/false', '/sbin/nologin')
  AND uid >= 1000;
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'privileges',
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.uid': { field: 'uid' },
    'osquery.shell': { field: 'shell' },
    'osquery.home_directory': { field: 'directory' },
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

/**
 * Drift - Persistence - Registry Run Keys (Windows)
 *
 * Tracks additions/removals of Registry Run key entries.
 * Security value: CRITICAL - Most common Windows persistence mechanism.
 */
export const DRIFT_PERSISTENCE_REGISTRY_RUN_KEYS: DriftQuery = {
  id: 'drift_persistence_registry_run_keys',
  name: 'Drift – Persistence – Registry Run Keys',
  description: 'Track changes to Registry Run key entries for auto-start programs',
  query: `
SELECT
  path,
  name,
  data,
  type,
  mtime
FROM registry
WHERE path LIKE 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run%'
   OR path LIKE 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce%'
   OR path LIKE 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run%'
   OR path LIKE 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce%'
   OR path LIKE 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run%';
  `.trim(),
  platform: 'windows',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.registry_path': { field: 'path' },
    'osquery.registry_name': { field: 'name' },
    'osquery.registry_data': { field: 'data' },
    'osquery.registry_type': { field: 'type' },
  },
};

/**
 * Drift - Persistence - WMI Event Subscriptions (Windows)
 *
 * Tracks WMI permanent event subscriptions.
 * Security value: CRITICAL - Fileless persistence mechanism used by APTs.
 */
export const DRIFT_PERSISTENCE_WMI_SUBSCRIPTIONS: DriftQuery = {
  id: 'drift_persistence_wmi_subscriptions',
  name: 'Drift – Persistence – WMI Event Subscriptions',
  description: 'Track WMI permanent event subscriptions',
  query: `
SELECT
  name,
  query,
  class,
  relative_path
FROM wmi_event_filters;
  `.trim(),
  platform: 'windows',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.wmi_filter_name': { field: 'name' },
    'osquery.wmi_filter_query': { field: 'query' },
    'osquery.wmi_filter_class': { field: 'class' },
  },
};

/**
 * Drift - Persistence - All Cron Jobs
 *
 * Tracks all cron jobs (not just external URL ones).
 * Security value: Complete cron visibility for persistence detection.
 */
export const DRIFT_PERSISTENCE_CRON_ALL: DriftQuery = {
  id: 'drift_persistence_cron_all',
  name: 'Drift – Persistence – All Cron Jobs',
  description: 'Track all cron job changes',
  query: `
SELECT
  event,
  minute,
  hour,
  day_of_month,
  month,
  day_of_week,
  command,
  path
FROM crontab;
  `.trim(),
  platform: 'linux,darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.cron_event': { field: 'event' },
    'osquery.cron_command': { field: 'command' },
    'osquery.cron_path': { field: 'path' },
    'osquery.cron_schedule': { field: 'minute' },
  },
};

/**
 * Drift - Persistence - At Jobs (Linux)
 *
 * Tracks scheduled at jobs.
 * Security value: One-time scheduled task persistence mechanism.
 */
export const DRIFT_PERSISTENCE_AT_JOBS: DriftQuery = {
  id: 'drift_persistence_at_jobs',
  name: 'Drift – Persistence – At Jobs',
  description: 'Track scheduled at jobs',
  query: `
SELECT
  time,
  job,
  command
FROM at_jobs;
  `.trim(),
  platform: 'linux',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.at_time': { field: 'time' },
    'osquery.at_job': { field: 'job' },
    'osquery.at_command': { field: 'command' },
  },
};

/**
 * Drift - Persistence - Browser Extensions (Risky)
 *
 * Tracks browser extensions with elevated permissions or update URLs.
 * Security value: Extensions with broad permissions can exfiltrate data.
 */
export const DRIFT_PERSISTENCE_BROWSER_EXTENSIONS_RISKY: DriftQuery = {
  id: 'drift_persistence_browser_extensions_risky',
  name: 'Drift – Persistence – Browser Extensions Risky',
  description: 'Track browser extensions with risky permissions',
  query: `
SELECT
  name,
  identifier,
  version,
  permissions,
  optional_permissions,
  update_url,
  path
FROM chrome_extensions
WHERE permissions LIKE '%<all_urls>%'
   OR permissions LIKE '%webRequest%'
   OR permissions LIKE '%cookies%'
   OR permissions LIKE '%history%'
   OR permissions LIKE '%tabs%';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.extension_name': { field: 'name' },
    'osquery.extension_id': { field: 'identifier' },
    'osquery.extension_version': { field: 'version' },
    'osquery.extension_permissions': { field: 'permissions' },
  },
};

/**
 * Drift - Persistence - Office Add-ins (Windows)
 *
 * Tracks Microsoft Office add-ins.
 * Security value: Office add-ins can execute code on document open.
 */
export const DRIFT_PERSISTENCE_OFFICE_ADDINS: DriftQuery = {
  id: 'drift_persistence_office_addins',
  name: 'Drift – Persistence – Office Add-ins',
  description: 'Track Microsoft Office add-ins',
  query: `
SELECT
  path,
  name,
  data,
  type
FROM registry
WHERE path LIKE 'HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\%\\Excel\\Options\\OPEN%'
   OR path LIKE 'HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\%\\Word\\Options\\STARTUP%'
   OR path LIKE 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Office\\%\\Addins\\%';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'persistence',
  ecsMapping: {
    'osquery.addin_path': { field: 'path' },
    'osquery.addin_name': { field: 'name' },
    'osquery.addin_data': { field: 'data' },
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

/**
 * Drift - Network - Hosts File Entries
 *
 * Tracks modifications to the hosts file.
 * Security value: Detects DNS hijacking via local hosts file manipulation.
 */
export const DRIFT_NETWORK_HOSTS_FILE: DriftQuery = {
  id: 'drift_network_hosts_file',
  name: 'Drift – Network – Hosts File',
  description: 'Track hosts file modifications',
  query: `
SELECT
  address,
  hostnames
FROM etc_hosts
WHERE address NOT IN ('127.0.0.1', '::1', 'fe00::0', 'ff00::0', 'ff02::1', 'ff02::2', 'ff02::3');
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.hosts_address': { field: 'address' },
    'osquery.hosts_hostnames': { field: 'hostnames' },
  },
};

/**
 * Drift - Network - DNS Resolvers
 *
 * Tracks DNS resolver configuration changes.
 * Security value: Detects DNS hijacking or rogue DNS configuration.
 */
export const DRIFT_NETWORK_DNS_RESOLVERS: DriftQuery = {
  id: 'drift_network_dns_resolvers',
  name: 'Drift – Network – DNS Resolvers',
  description: 'Track DNS resolver configuration',
  query: `
SELECT
  id,
  type,
  address,
  netmask,
  options
FROM dns_resolvers;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.dns_resolver_id': { field: 'id' },
    'osquery.dns_resolver_type': { field: 'type' },
    'osquery.dns_resolver_address': { field: 'address' },
  },
};

/**
 * Drift - Network - Interfaces
 *
 * Tracks network interface changes.
 * Security value: Detects new network interfaces (VPN, virtual, rogue adapters).
 */
export const DRIFT_NETWORK_INTERFACES: DriftQuery = {
  id: 'drift_network_interfaces',
  name: 'Drift – Network – Interfaces',
  description: 'Track network interface changes',
  query: `
SELECT
  interface,
  mac,
  type,
  mtu,
  flags
FROM interface_details
WHERE interface NOT LIKE 'lo%'
  AND interface NOT LIKE 'docker%'
  AND interface NOT LIKE 'veth%'
  AND interface NOT LIKE 'br-%';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.interface_name': { field: 'interface' },
    'osquery.interface_mac': { field: 'mac' },
    'osquery.interface_type': { field: 'type' },
  },
};

/**
 * Drift - Network - Routes
 *
 * Tracks routing table changes.
 * Security value: Detects route hijacking or traffic redirection.
 */
export const DRIFT_NETWORK_ROUTES: DriftQuery = {
  id: 'drift_network_routes',
  name: 'Drift – Network – Routes',
  description: 'Track routing table changes',
  query: `
SELECT
  destination,
  netmask,
  gateway,
  interface,
  type
FROM routes
WHERE destination != '127.0.0.0'
  AND destination != '::1';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.route_destination': { field: 'destination' },
    'osquery.route_gateway': { field: 'gateway' },
    'osquery.route_interface': { field: 'interface' },
  },
};

/**
 * Drift - Network - ARP Cache
 *
 * Tracks ARP cache changes.
 * Security value: Detects ARP spoofing or man-in-the-middle attacks.
 */
export const DRIFT_NETWORK_ARP_CACHE: DriftQuery = {
  id: 'drift_network_arp_cache',
  name: 'Drift – Network – ARP Cache',
  description: 'Track ARP cache changes for spoofing detection',
  query: `
SELECT
  address,
  mac,
  interface,
  permanent
FROM arp_cache
WHERE permanent = '1';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.arp_address': { field: 'address' },
    'osquery.arp_mac': { field: 'mac' },
    'osquery.arp_interface': { field: 'interface' },
  },
};

/**
 * Drift - Network - Established Connections
 *
 * Tracks established network connections.
 * Security value: Detects C2 channels and data exfiltration.
 */
export const DRIFT_NETWORK_ESTABLISHED_CONNECTIONS: DriftQuery = {
  id: 'drift_network_established_connections',
  name: 'Drift – Network – Established Connections',
  description: 'Track established network connections',
  query: `
SELECT
  p.pid,
  p.name AS process_name,
  p.path AS process_path,
  ps.local_address,
  ps.local_port,
  ps.remote_address,
  ps.remote_port,
  ps.protocol
FROM process_open_sockets ps
JOIN processes p ON ps.pid = p.pid
WHERE ps.state = 'ESTABLISHED'
  AND ps.remote_address NOT IN ('127.0.0.1', '::1', '0.0.0.0');
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 900,
  snapshot: false,
  removed: false,
  category: 'network',
  ecsMapping: {
    'osquery.process_name': { field: 'process_name' },
    'osquery.local_address': { field: 'local_address' },
    'osquery.remote_address': { field: 'remote_address' },
    'osquery.remote_port': { field: 'remote_port' },
  },
};

/**
 * Drift - Network - WiFi Networks
 *
 * Tracks known WiFi network changes.
 * Security value: Detects rogue access point connections.
 */
export const DRIFT_NETWORK_WIFI_NETWORKS: DriftQuery = {
  id: 'drift_network_wifi_networks',
  name: 'Drift – Network – WiFi Networks',
  description: 'Track known WiFi network changes',
  query: `
SELECT
  ssid,
  network_name,
  security_type,
  last_connected,
  auto_login
FROM wifi_networks;
  `.trim(),
  platform: 'windows,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.wifi_ssid': { field: 'ssid' },
    'osquery.wifi_network_name': { field: 'network_name' },
    'osquery.wifi_security_type': { field: 'security_type' },
  },
};

/**
 * Drift - Network - Proxy Settings
 *
 * Tracks system proxy configuration changes.
 * Security value: Detects traffic interception via proxy manipulation.
 */
export const DRIFT_NETWORK_PROXY_SETTINGS: DriftQuery = {
  id: 'drift_network_proxy_settings',
  name: 'Drift – Network – Proxy Settings',
  description: 'Track system proxy configuration',
  query: `
SELECT
  path,
  name,
  data
FROM registry
WHERE path LIKE 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings%'
  AND name IN ('ProxyServer', 'ProxyEnable', 'AutoConfigURL', 'ProxyOverride');
  `.trim(),
  platform: 'windows',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'network',
  ecsMapping: {
    'osquery.proxy_path': { field: 'path' },
    'osquery.proxy_setting': { field: 'name' },
    'osquery.proxy_value': { field: 'data' },
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

/**
 * Drift - Software - Python Packages
 *
 * Tracks Python package installations.
 * Security value: Detects supply chain attacks via malicious packages.
 */
export const DRIFT_SOFTWARE_PYTHON_PACKAGES: DriftQuery = {
  id: 'drift_software_python_packages',
  name: 'Drift – Software – Python Packages',
  description: 'Track Python package installations',
  query: `
SELECT
  name,
  version,
  author,
  license,
  path
FROM python_packages;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.python_package_name': { field: 'name' },
    'osquery.python_package_version': { field: 'version' },
    'osquery.python_package_author': { field: 'author' },
  },
};

/**
 * Drift - Software - NPM Global Packages
 *
 * Tracks globally installed NPM packages.
 * Security value: Detects supply chain attacks via malicious npm packages.
 */
export const DRIFT_SOFTWARE_NPM_PACKAGES: DriftQuery = {
  id: 'drift_software_npm_packages',
  name: 'Drift – Software – NPM Global Packages',
  description: 'Track NPM global package installations',
  query: `
SELECT
  name,
  version,
  description,
  author,
  license,
  path
FROM npm_packages;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.npm_package_name': { field: 'name' },
    'osquery.npm_package_version': { field: 'version' },
    'osquery.npm_package_author': { field: 'author' },
  },
};

/**
 * Drift - Software - Homebrew Packages
 *
 * Tracks Homebrew package installations on macOS.
 * Security value: Detects unauthorized software on macOS via brew.
 */
export const DRIFT_SOFTWARE_HOMEBREW: DriftQuery = {
  id: 'drift_software_homebrew',
  name: 'Drift – Software – Homebrew Packages',
  description: 'Track Homebrew package installations',
  query: `
SELECT
  name,
  version,
  path
FROM homebrew_packages;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.homebrew_name': { field: 'name' },
    'osquery.homebrew_version': { field: 'version' },
    'osquery.homebrew_path': { field: 'path' },
  },
};

/**
 * Drift - Software - Windows Optional Features
 *
 * Tracks Windows optional features and capabilities.
 * Security value: Detects enabling of dangerous features like WSL, Hyper-V.
 */
export const DRIFT_SOFTWARE_WINDOWS_FEATURES: DriftQuery = {
  id: 'drift_software_windows_features',
  name: 'Drift – Software – Windows Features',
  description: 'Track Windows optional features',
  query: `
SELECT
  name,
  caption,
  statename
FROM windows_optional_features
WHERE statename = 'Enabled';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'software',
  ecsMapping: {
    'osquery.feature_name': { field: 'name' },
    'osquery.feature_caption': { field: 'caption' },
    'osquery.feature_state': { field: 'statename' },
  },
};

/**
 * Drift - Software - Kernel Extensions (macOS)
 *
 * Tracks macOS kernel extensions.
 * Security value: Kernel extensions run with highest privileges.
 */
export const DRIFT_SOFTWARE_KERNEL_EXTENSIONS: DriftQuery = {
  id: 'drift_software_kernel_extensions',
  name: 'Drift – Software – Kernel Extensions macOS',
  description: 'Track macOS kernel extensions',
  query: `
SELECT
  name,
  version,
  linked_against,
  path
FROM kernel_extensions;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'software',
  ecsMapping: {
    'osquery.kext_name': { field: 'name' },
    'osquery.kext_version': { field: 'version' },
    'osquery.kext_path': { field: 'path' },
  },
};

/**
 * Drift - Software - Edge Extensions
 *
 * Tracks Microsoft Edge browser extensions.
 * Security value: Extensions can exfiltrate data or inject scripts.
 */
export const DRIFT_SOFTWARE_EDGE_EXTENSIONS: DriftQuery = {
  id: 'drift_software_edge_extensions',
  name: 'Drift – Software – Edge Extensions',
  description: 'Track Microsoft Edge extensions',
  query: `
SELECT
  name,
  version,
  identifier,
  path
FROM chrome_extensions
WHERE path LIKE '%Microsoft\\Edge%'
   OR path LIKE '%microsoft-edge%';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'software',
  ecsMapping: {
    'osquery.edge_extension_name': { field: 'name' },
    'osquery.edge_extension_version': { field: 'version' },
    'osquery.edge_extension_id': { field: 'identifier' },
  },
};

// =============================================================================
// POSTURE DRIFT QUERIES (Differential: real-time change detection)
// =============================================================================

/**
 * Drift - Posture - Disk Encryption
 *
 * Real-time tracking of disk encryption status changes.
 * Security value: Detects when disk encryption is disabled (security regression).
 */
export const DRIFT_POSTURE_DISK_ENCRYPTION: DriftQuery = {
  id: 'drift_posture_disk_encryption',
  name: 'Drift – Posture – Disk Encryption',
  description: 'Track changes to disk encryption status',
  query: `
SELECT
  encrypted,
  type,
  name,
  uid
FROM disk_encryption;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.encrypted': { field: 'encrypted' },
    'osquery.type': { field: 'type' },
    'osquery.name': { field: 'name' },
  },
};

/**
 * Drift - Posture - Firewall Linux
 *
 * Real-time tracking of Linux iptables posture changes.
 * Security value: Detects when firewall rules are modified or disabled.
 */
export const DRIFT_POSTURE_FIREWALL_LINUX: DriftQuery = {
  id: 'drift_posture_firewall_linux',
  name: 'Drift – Posture – Firewall Linux',
  description: 'Track changes to Linux firewall status',
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
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.firewall_enabled': { field: 'firewall_enabled' },
    'osquery.rule_count': { field: 'rule_count' },
  },
};

/**
 * Drift - Posture - Firewall macOS
 *
 * Real-time tracking of macOS Application Layer Firewall status.
 * Security value: Detects when firewall is disabled on macOS.
 */
export const DRIFT_POSTURE_FIREWALL_MACOS: DriftQuery = {
  id: 'drift_posture_firewall_macos',
  name: 'Drift – Posture – Firewall macOS',
  description: 'Track changes to macOS firewall status',
  query: `
SELECT
  global_state,
  logging_enabled,
  stealth_enabled,
  firewall_unload
FROM alf;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.global_state': { field: 'global_state' },
    'osquery.firewall_unload': { field: 'firewall_unload' },
  },
};

/**
 * Drift - Posture - Firewall Windows
 *
 * Real-time tracking of Windows firewall rule changes.
 * Security value: Detects changes to firewall configuration.
 */
export const DRIFT_POSTURE_FIREWALL_WINDOWS: DriftQuery = {
  id: 'drift_posture_firewall_windows',
  name: 'Drift – Posture – Firewall Windows',
  description: 'Track changes to Windows firewall rules',
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
  interval: 3600,
  snapshot: false,
  removed: true,
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
 * Real-time tracking of Secure Boot status changes.
 * Security value: Detects when Secure Boot is disabled.
 */
export const DRIFT_POSTURE_SECURE_BOOT: DriftQuery = {
  id: 'drift_posture_secure_boot',
  name: 'Drift – Posture – Secure Boot',
  description: 'Track changes to Secure Boot status',
  query: `
SELECT
  secure_boot,
  setup_mode
FROM secureboot;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.secure_boot': { field: 'secure_boot' },
    'osquery.setup_mode': { field: 'setup_mode' },
  },
};

/**
 * Drift - Posture - Windows Defender Status
 *
 * Real-time tracking of Windows Defender and security product status.
 * Security value: Detects when antivirus/EDR is disabled or tampered with.
 */
export const DRIFT_POSTURE_WINDOWS_DEFENDER: DriftQuery = {
  id: 'drift_posture_windows_defender',
  name: 'Drift – Posture – Windows Defender Status',
  description: 'Track changes to Windows Defender and security products',
  query: `
SELECT
  type,
  name,
  state,
  signatures_up_to_date
FROM windows_security_products;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.security_product_type': { field: 'type' },
    'osquery.security_product_name': { field: 'name' },
    'osquery.security_product_state': { field: 'state' },
    'osquery.signatures_current': { field: 'signatures_up_to_date' },
  },
};

/**
 * Drift - Posture - SIP Status macOS
 *
 * Real-time tracking of System Integrity Protection status.
 * Security value: Detects when SIP is disabled (major security regression).
 */
export const DRIFT_POSTURE_SIP_MACOS: DriftQuery = {
  id: 'drift_posture_sip_macos',
  name: 'Drift – Posture – SIP Status macOS',
  description: 'Track changes to System Integrity Protection status',
  query: `
SELECT
  config_flag,
  enabled,
  enabled_nvram
FROM sip_config;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.sip_config_flag': { field: 'config_flag' },
    'osquery.sip_enabled': { field: 'enabled' },
    'osquery.sip_enabled_nvram': { field: 'enabled_nvram' },
  },
};

/**
 * Drift - Posture - Gatekeeper macOS
 *
 * Real-time tracking of Gatekeeper status.
 * Security value: Detects when app signing enforcement is disabled.
 */
export const DRIFT_POSTURE_GATEKEEPER_MACOS: DriftQuery = {
  id: 'drift_posture_gatekeeper_macos',
  name: 'Drift – Posture – Gatekeeper macOS',
  description: 'Track changes to Gatekeeper status',
  query: `
SELECT
  assessments_enabled
FROM gatekeeper;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.gatekeeper_enabled': { field: 'assessments_enabled' },
  },
};

/**
 * Drift - Posture - SELinux Status
 *
 * Real-time tracking of SELinux enforcement status.
 * Security value: Detects when mandatory access control is disabled.
 */
export const DRIFT_POSTURE_SELINUX: DriftQuery = {
  id: 'drift_posture_selinux',
  name: 'Drift – Posture – SELinux Status',
  description: 'Track changes to SELinux enforcement status',
  query: `
SELECT
  enforce,
  config_policy,
  version
FROM selinux_settings;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.selinux_enforce': { field: 'enforce' },
    'osquery.selinux_policy': { field: 'config_policy' },
    'osquery.selinux_version': { field: 'version' },
  },
};

/**
 * Drift - Posture - SSH Server Config
 *
 * Real-time tracking of SSH server configuration changes.
 * Security value: Detects dangerous SSH config changes (root login, password auth).
 */
export const DRIFT_POSTURE_SSH_CONFIG: DriftQuery = {
  id: 'drift_posture_ssh_config',
  name: 'Drift – Posture – SSH Server Config',
  description: 'Track changes to SSH server configuration',
  query: `
SELECT
  block,
  option,
  value
FROM ssh_configs
WHERE option IN (
  'PermitRootLogin',
  'PasswordAuthentication',
  'PubkeyAuthentication',
  'PermitEmptyPasswords',
  'X11Forwarding',
  'AllowTcpForwarding',
  'GatewayPorts'
);
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.ssh_config_block': { field: 'block' },
    'osquery.ssh_config_option': { field: 'option' },
    'osquery.ssh_config_value': { field: 'value' },
  },
};

/**
 * Drift - Posture - Kernel Hardening
 *
 * Real-time tracking of kernel security parameters.
 * Security value: Detects when kernel hardening is weakened (ASLR, etc).
 */
export const DRIFT_POSTURE_KERNEL_HARDENING: DriftQuery = {
  id: 'drift_posture_kernel_hardening',
  name: 'Drift – Posture – Kernel Hardening',
  description: 'Track changes to kernel security parameters',
  query: `
SELECT
  name,
  current_value
FROM system_controls
WHERE name IN (
  'kernel.randomize_va_space',
  'kernel.dmesg_restrict',
  'kernel.kptr_restrict',
  'kernel.yama.ptrace_scope',
  'net.ipv4.conf.all.accept_redirects',
  'net.ipv4.conf.all.send_redirects',
  'net.ipv4.ip_forward',
  'net.ipv4.conf.all.accept_source_route',
  'net.ipv6.conf.all.accept_redirects'
);
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.sysctl_name': { field: 'name' },
    'osquery.sysctl_value': { field: 'current_value' },
  },
};

/**
 * Drift - Posture - Password Policy Windows
 *
 * Real-time tracking of Windows password policy settings.
 * Security value: Detects weakening of password requirements.
 */
export const DRIFT_POSTURE_PASSWORD_POLICY_WINDOWS: DriftQuery = {
  id: 'drift_posture_password_policy_windows',
  name: 'Drift – Posture – Password Policy Windows',
  description: 'Track changes to Windows password policy',
  query: `
SELECT
  minimum_password_length,
  password_history,
  maximum_password_age,
  minimum_password_age,
  lockout_threshold,
  lockout_duration
FROM password_policy;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.min_password_length': { field: 'minimum_password_length' },
    'osquery.password_history': { field: 'password_history' },
    'osquery.max_password_age': { field: 'maximum_password_age' },
    'osquery.lockout_threshold': { field: 'lockout_threshold' },
  },
};

/**
 * Drift - Posture - Auto Updates Windows
 *
 * Tracks Windows Update configuration.
 * Security value: Detects when auto-updates are disabled.
 */
export const DRIFT_POSTURE_AUTO_UPDATES_WINDOWS: DriftQuery = {
  id: 'drift_posture_auto_updates_windows',
  name: 'Drift – Posture – Auto Updates Windows',
  description: 'Track Windows Update configuration',
  query: `
SELECT
  path,
  name,
  data
FROM registry
WHERE path LIKE 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU%'
  AND name IN ('NoAutoUpdate', 'AUOptions', 'NoAutoRebootWithLoggedOnUsers');
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.update_policy_path': { field: 'path' },
    'osquery.update_policy_name': { field: 'name' },
    'osquery.update_policy_value': { field: 'data' },
  },
};

/**
 * Drift - Posture - RDP Enabled
 *
 * Tracks Remote Desktop Protocol enablement.
 * Security value: RDP is a common attack vector.
 */
export const DRIFT_POSTURE_RDP_ENABLED: DriftQuery = {
  id: 'drift_posture_rdp_enabled',
  name: 'Drift – Posture – RDP Enabled',
  description: 'Track RDP enablement status',
  query: `
SELECT
  path,
  name,
  data
FROM registry
WHERE path = 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server'
  AND name = 'fDenyTSConnections';
  `.trim(),
  platform: 'windows',
  interval: 1800,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.rdp_path': { field: 'path' },
    'osquery.rdp_setting': { field: 'name' },
    'osquery.rdp_enabled': { field: 'data' },
  },
};

/**
 * Drift - Posture - Screen Lock Settings
 *
 * Tracks screen lock configuration.
 * Security value: Weak or disabled screen lock allows unauthorized access.
 */
export const DRIFT_POSTURE_SCREEN_LOCK: DriftQuery = {
  id: 'drift_posture_screen_lock',
  name: 'Drift – Posture – Screen Lock Settings',
  description: 'Track screen lock configuration',
  query: `
SELECT
  path,
  name,
  data
FROM registry
WHERE path LIKE 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization%'
  AND name IN ('NoLockScreen', 'LockScreenTimeout');
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.screen_lock_path': { field: 'path' },
    'osquery.screen_lock_setting': { field: 'name' },
    'osquery.screen_lock_value': { field: 'data' },
  },
};

/**
 * Drift - Posture - Audit Policy Windows
 *
 * Tracks Windows audit policy configuration.
 * Security value: Detects when audit logging is weakened.
 */
export const DRIFT_POSTURE_AUDIT_POLICY: DriftQuery = {
  id: 'drift_posture_audit_policy',
  name: 'Drift – Posture – Audit Policy Windows',
  description: 'Track Windows audit policy configuration',
  query: `
SELECT
  subcategory,
  setting,
  subcategory_guid
FROM secureboot_audit_policy;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.audit_subcategory': { field: 'subcategory' },
    'osquery.audit_setting': { field: 'setting' },
  },
};

/**
 * Drift - Posture - Credential Guard
 *
 * Tracks Credential Guard status.
 * Security value: Credential Guard protects credentials from theft.
 */
export const DRIFT_POSTURE_CREDENTIAL_GUARD: DriftQuery = {
  id: 'drift_posture_credential_guard',
  name: 'Drift – Posture – Credential Guard',
  description: 'Track Credential Guard status',
  query: `
SELECT
  path,
  name,
  data
FROM registry
WHERE path = 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard'
  AND name IN ('EnableVirtualizationBasedSecurity', 'RequirePlatformSecurityFeatures', 'LsaCfgFlags');
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.credential_guard_path': { field: 'path' },
    'osquery.credential_guard_setting': { field: 'name' },
    'osquery.credential_guard_value': { field: 'data' },
  },
};

/**
 * Drift - Posture - UAC Settings
 *
 * Tracks User Account Control settings.
 * Security value: UAC bypass allows privilege escalation.
 */
export const DRIFT_POSTURE_UAC_SETTINGS: DriftQuery = {
  id: 'drift_posture_uac_settings',
  name: 'Drift – Posture – UAC Settings',
  description: 'Track UAC configuration',
  query: `
SELECT
  path,
  name,
  data
FROM registry
WHERE path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System'
  AND name IN ('EnableLUA', 'ConsentPromptBehaviorAdmin', 'PromptOnSecureDesktop');
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.uac_path': { field: 'path' },
    'osquery.uac_setting': { field: 'name' },
    'osquery.uac_value': { field: 'data' },
  },
};

/**
 * Drift - Posture - AppArmor Status
 *
 * Tracks AppArmor profile status.
 * Security value: Detects when mandatory access control profiles are disabled.
 */
export const DRIFT_POSTURE_APPARMOR: DriftQuery = {
  id: 'drift_posture_apparmor',
  name: 'Drift – Posture – AppArmor Status',
  description: 'Track AppArmor profile status',
  query: `
SELECT
  name,
  mode,
  attach
FROM apparmor_profiles;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.apparmor_name': { field: 'name' },
    'osquery.apparmor_mode': { field: 'mode' },
    'osquery.apparmor_attach': { field: 'attach' },
  },
};

/**
 * Drift - Posture - Time Sync Configuration
 *
 * Tracks NTP/time synchronization configuration.
 * Security value: Time manipulation can be used to bypass security controls.
 */
export const DRIFT_POSTURE_TIME_SYNC: DriftQuery = {
  id: 'drift_posture_time_sync',
  name: 'Drift – Posture – Time Sync Configuration',
  description: 'Track time synchronization configuration',
  query: `
SELECT
  id AS name,
  fragment_path AS path,
  active_state AS status
FROM systemd_units
WHERE id LIKE '%ntp%' OR id LIKE '%chrony%' OR id LIKE '%timesyncd%';
  `.trim(),
  platform: 'linux',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'posture',
  ecsMapping: {
    'osquery.time_sync_name': { field: 'name' },
    'osquery.time_sync_path': { field: 'path' },
    'osquery.time_sync_status': { field: 'status' },
  },
};

// =============================================================================
// CERTIFICATES DRIFT QUERIES (Differential: track trust changes)
// =============================================================================

/**
 * Drift - Certificates - System CA Store
 *
 * Tracks changes to the system CA certificate store.
 * Security value: Detects CA injection for MITM attacks.
 */
export const DRIFT_CERTIFICATES_SYSTEM_CA: DriftQuery = {
  id: 'drift_certificates_system_ca',
  name: 'Drift – Certificates – System CA Store',
  description: 'Track system CA certificate store changes',
  query: `
SELECT
  common_name,
  issuer,
  sha256_fingerprint,
  serial,
  not_valid_after
FROM certificates
WHERE path LIKE '/etc/ssl%' OR path LIKE '/System/Library/Keychains%';
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'certificates',
  ecsMapping: {
    'osquery.cert_common_name': { field: 'common_name' },
    'osquery.cert_issuer': { field: 'issuer' },
    'osquery.cert_sha256': { field: 'sha256_fingerprint' },
  },
};

/**
 * Drift - Certificates - Windows Certificate Store
 *
 * Tracks changes to Windows certificate stores.
 * Security value: Detects CA injection for MITM attacks on Windows.
 */
export const DRIFT_CERTIFICATES_WINDOWS_STORE: DriftQuery = {
  id: 'drift_certificates_windows_store',
  name: 'Drift – Certificates – Windows Store',
  description: 'Track Windows certificate store changes',
  query: `
SELECT
  common_name,
  issuer,
  sha1,
  serial,
  store,
  not_valid_after
FROM certificates
WHERE store IN ('ROOT', 'CA', 'MY');
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'certificates',
  ecsMapping: {
    'osquery.cert_common_name': { field: 'common_name' },
    'osquery.cert_issuer': { field: 'issuer' },
    'osquery.cert_store': { field: 'store' },
    'osquery.cert_sha1': { field: 'sha1' },
  },
};

/**
 * Drift - Certificates - Untrusted Certificates
 *
 * Tracks explicitly untrusted certificates.
 * Security value: Monitors certificate revocation/blacklist.
 */
export const DRIFT_CERTIFICATES_UNTRUSTED: DriftQuery = {
  id: 'drift_certificates_untrusted',
  name: 'Drift – Certificates – Untrusted',
  description: 'Track untrusted certificate changes',
  query: `
SELECT
  common_name,
  issuer,
  sha1,
  serial,
  store
FROM certificates
WHERE store = 'Disallowed';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'certificates',
  ecsMapping: {
    'osquery.cert_common_name': { field: 'common_name' },
    'osquery.cert_issuer': { field: 'issuer' },
    'osquery.cert_sha1': { field: 'sha1' },
  },
};

/**
 * Drift - Certificates - Expiring Soon
 *
 * Tracks certificates expiring within 30 days.
 * Security value: Certificate expiration can cause service disruption.
 */
export const DRIFT_CERTIFICATES_EXPIRING: DriftQuery = {
  id: 'drift_certificates_expiring',
  name: 'Drift – Certificates – Expiring Soon',
  description: 'Track certificates expiring within 30 days',
  query: `
SELECT
  common_name,
  issuer,
  not_valid_after,
  sha256_fingerprint,
  path
FROM certificates
WHERE datetime(not_valid_after, 'unixepoch') < datetime('now', '+30 days')
  AND datetime(not_valid_after, 'unixepoch') > datetime('now');
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 86400,
  snapshot: false,
  removed: true,
  category: 'certificates',
  ecsMapping: {
    'osquery.cert_common_name': { field: 'common_name' },
    'osquery.cert_expiry': { field: 'not_valid_after' },
    'osquery.cert_path': { field: 'path' },
  },
};

// =============================================================================
// HARDWARE DRIFT QUERIES (Differential: track hardware changes)
// =============================================================================

/**
 * Drift - Hardware - System Info
 *
 * Tracks system hardware configuration changes.
 * Security value: Detects VM migration or hardware tampering.
 */
export const DRIFT_HARDWARE_SYSTEM_INFO: DriftQuery = {
  id: 'drift_hardware_system_info',
  name: 'Drift – Hardware – System Info',
  description: 'Track system hardware configuration',
  query: `
SELECT
  hostname,
  uuid,
  computer_name,
  hardware_vendor,
  hardware_model,
  hardware_serial,
  cpu_brand,
  physical_memory
FROM system_info;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 86400,
  snapshot: false,
  removed: true,
  category: 'hardware',
  ecsMapping: {
    'osquery.hostname': { field: 'hostname' },
    'osquery.uuid': { field: 'uuid' },
    'osquery.hardware_vendor': { field: 'hardware_vendor' },
    'osquery.hardware_model': { field: 'hardware_model' },
  },
};

/**
 * Drift - Hardware - CPU Info
 *
 * Tracks CPU configuration changes.
 * Security value: Detects VM migration or resource manipulation.
 */
export const DRIFT_HARDWARE_CPU_INFO: DriftQuery = {
  id: 'drift_hardware_cpu_info',
  name: 'Drift – Hardware – CPU Info',
  description: 'Track CPU configuration',
  query: `
SELECT
  device_id,
  model,
  manufacturer,
  number_of_cores,
  logical_processors
FROM cpu_info;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 86400,
  snapshot: false,
  removed: true,
  category: 'hardware',
  ecsMapping: {
    'osquery.cpu_model': { field: 'model' },
    'osquery.cpu_manufacturer': { field: 'manufacturer' },
    'osquery.cpu_cores': { field: 'number_of_cores' },
  },
};

/**
 * Drift - Hardware - Physical Disks
 *
 * Tracks physical disk changes.
 * Security value: Detects disk additions (potential exfiltration).
 */
export const DRIFT_HARDWARE_PHYSICAL_DISKS: DriftQuery = {
  id: 'drift_hardware_physical_disks',
  name: 'Drift – Hardware – Physical Disks',
  description: 'Track physical disk changes',
  query: `
SELECT
  name,
  disk_size,
  manufacturer,
  model,
  serial
FROM disk_info;
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'hardware',
  ecsMapping: {
    'osquery.disk_name': { field: 'name' },
    'osquery.disk_size': { field: 'disk_size' },
    'osquery.disk_manufacturer': { field: 'manufacturer' },
    'osquery.disk_serial': { field: 'serial' },
  },
};

/**
 * Drift - Hardware - USB Devices
 *
 * Tracks USB device connections.
 * Security value: Detects unauthorized USB devices (data theft, malware).
 */
export const DRIFT_HARDWARE_USB_DEVICES: DriftQuery = {
  id: 'drift_hardware_usb_devices',
  name: 'Drift – Hardware – USB Devices',
  description: 'Track USB device connections',
  query: `
SELECT
  vendor,
  vendor_id,
  model,
  model_id,
  serial,
  class,
  subclass
FROM usb_devices
WHERE class != '9';
  `.trim(),
  platform: 'windows,linux,darwin',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'hardware',
  ecsMapping: {
    'osquery.usb_vendor': { field: 'vendor' },
    'osquery.usb_model': { field: 'model' },
    'osquery.usb_serial': { field: 'serial' },
    'osquery.usb_class': { field: 'class' },
  },
};

/**
 * Drift - Hardware - PCI Devices
 *
 * Tracks PCI device changes.
 * Security value: Detects hardware-based attacks (DMA, evil maid).
 */
export const DRIFT_HARDWARE_PCI_DEVICES: DriftQuery = {
  id: 'drift_hardware_pci_devices',
  name: 'Drift – Hardware – PCI Devices',
  description: 'Track PCI device changes',
  query: `
SELECT
  pci_slot,
  driver,
  vendor,
  vendor_id,
  model,
  model_id,
  pci_class
FROM pci_devices;
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: true,
  category: 'hardware',
  ecsMapping: {
    'osquery.pci_slot': { field: 'pci_slot' },
    'osquery.pci_vendor': { field: 'vendor' },
    'osquery.pci_model': { field: 'model' },
    'osquery.pci_driver': { field: 'driver' },
  },
};

// =============================================================================
// RUNTIME DRIFT QUERIES (Differential: track runtime changes)
// =============================================================================

/**
 * Drift - Runtime - High Privilege Processes
 *
 * Tracks processes running as root/SYSTEM.
 * Security value: Detects unauthorized privileged process execution.
 */
export const DRIFT_RUNTIME_HIGH_PRIVILEGE_PROCESSES: DriftQuery = {
  id: 'drift_runtime_high_privilege_processes',
  name: 'Drift – Runtime – High Privilege Processes',
  description: 'Track processes running as root/SYSTEM',
  query: `
SELECT
  name,
  path,
  cmdline,
  uid,
  gid,
  parent
FROM processes
WHERE uid = 0 OR uid = '0'
  AND name NOT IN ('systemd', 'init', 'kworker', 'kthreadd', 'migration', 'rcu_sched');
  `.trim(),
  platform: 'linux,darwin',
  interval: 900,
  snapshot: false,
  removed: false,
  category: 'runtime',
  ecsMapping: {
    'osquery.process_name': { field: 'name' },
    'osquery.process_path': { field: 'path' },
    'osquery.process_cmdline': { field: 'cmdline' },
  },
};

/**
 * Drift - Runtime - Process Open Files
 *
 * Tracks files opened by processes.
 * Security value: Detects data access patterns and exfiltration attempts.
 */
export const DRIFT_RUNTIME_PROCESS_OPEN_FILES: DriftQuery = {
  id: 'drift_runtime_process_open_files',
  name: 'Drift – Runtime – Process Open Files',
  description: 'Track sensitive files accessed by processes',
  query: `
SELECT
  p.name AS process_name,
  p.path AS process_path,
  pof.path AS file_path,
  pof.fd
FROM process_open_files pof
JOIN processes p ON pof.pid = p.pid
WHERE pof.path LIKE '%/etc/passwd%'
   OR pof.path LIKE '%/etc/shadow%'
   OR pof.path LIKE '%.ssh/%'
   OR pof.path LIKE '%credentials%'
   OR pof.path LIKE '%/.aws/%';
  `.trim(),
  platform: 'linux,darwin',
  interval: 900,
  snapshot: false,
  removed: false,
  category: 'runtime',
  ecsMapping: {
    'osquery.process_name': { field: 'process_name' },
    'osquery.file_path': { field: 'file_path' },
  },
};

/**
 * Drift - Runtime - Mounted Filesystems
 *
 * Tracks filesystem mounts.
 * Security value: Detects unauthorized mounts (USB, network shares).
 */
export const DRIFT_RUNTIME_MOUNTS: DriftQuery = {
  id: 'drift_runtime_mounts',
  name: 'Drift – Runtime – Mounted Filesystems',
  description: 'Track filesystem mount changes',
  query: `
SELECT
  device,
  path,
  type,
  flags
FROM mounts
WHERE type NOT IN ('sysfs', 'proc', 'devtmpfs', 'devpts', 'tmpfs', 'securityfs', 'cgroup', 'cgroup2', 'pstore', 'debugfs', 'tracefs', 'configfs', 'fusectl', 'mqueue', 'hugetlbfs', 'autofs', 'bpf');
  `.trim(),
  platform: 'linux,darwin',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'runtime',
  ecsMapping: {
    'osquery.mount_device': { field: 'device' },
    'osquery.mount_path': { field: 'path' },
    'osquery.mount_type': { field: 'type' },
  },
};

/**
 * Drift - Runtime - Docker Containers
 *
 * Tracks running Docker containers.
 * Security value: Detects unauthorized container execution.
 */
export const DRIFT_RUNTIME_DOCKER_CONTAINERS: DriftQuery = {
  id: 'drift_runtime_docker_containers',
  name: 'Drift – Runtime – Docker Containers',
  description: 'Track running Docker containers',
  query: `
SELECT
  id,
  name,
  image,
  image_id,
  status,
  privileged,
  security_options
FROM docker_containers;
  `.trim(),
  platform: 'linux',
  interval: 900,
  snapshot: false,
  removed: true,
  category: 'runtime',
  ecsMapping: {
    'osquery.container_id': { field: 'id' },
    'osquery.container_name': { field: 'name' },
    'osquery.container_image': { field: 'image' },
    'osquery.container_privileged': { field: 'privileged' },
  },
};

/**
 * Drift - Runtime - Environment Variables
 *
 * Tracks process environment variables for sensitive values.
 * Security value: Detects secrets exposed via environment.
 */
export const DRIFT_RUNTIME_ENV_VARS: DriftQuery = {
  id: 'drift_runtime_env_vars',
  name: 'Drift – Runtime – Environment Variables',
  description: 'Track sensitive environment variables',
  query: `
SELECT
  p.name AS process_name,
  pe.key,
  pe.value
FROM process_envs pe
JOIN processes p ON pe.pid = p.pid
WHERE pe.key LIKE '%TOKEN%'
   OR pe.key LIKE '%SECRET%'
   OR pe.key LIKE '%PASSWORD%'
   OR pe.key LIKE '%API_KEY%'
   OR pe.key LIKE '%CREDENTIALS%';
  `.trim(),
  platform: 'linux,darwin',
  interval: 3600,
  snapshot: false,
  removed: false,
  category: 'runtime',
  ecsMapping: {
    'osquery.process_name': { field: 'process_name' },
    'osquery.env_key': { field: 'key' },
    'osquery.env_value': { field: 'value' },
  },
};

/**
 * Drift - Runtime - Memory Maps
 *
 * Tracks suspicious memory mappings (RWX).
 * Security value: Detects code injection and shellcode execution.
 */
export const DRIFT_RUNTIME_MEMORY_MAPS: DriftQuery = {
  id: 'drift_runtime_memory_maps',
  name: 'Drift – Runtime – Memory Maps',
  description: 'Track suspicious memory mappings (RWX)',
  query: `
SELECT
  p.name AS process_name,
  p.path AS process_path,
  pm.permissions,
  pm.device,
  pm.path AS mapping_path
FROM process_memory_map pm
JOIN processes p ON pm.pid = p.pid
WHERE pm.permissions LIKE '%rwx%';
  `.trim(),
  platform: 'linux',
  interval: 1800,
  snapshot: false,
  removed: false,
  category: 'runtime',
  ecsMapping: {
    'osquery.process_name': { field: 'process_name' },
    'osquery.memory_permissions': { field: 'permissions' },
    'osquery.mapping_path': { field: 'mapping_path' },
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
    sshAuthorizedKeys: DRIFT_PRIVILEGES_SSH_AUTHORIZED_KEYS,
    suidBinaries: DRIFT_PRIVILEGES_SUID_BINARIES,
    activeSessions: DRIFT_PRIVILEGES_ACTIVE_SESSIONS,
    logonSessionsWindows: DRIFT_PRIVILEGES_LOGON_SESSIONS_WINDOWS,
    cloudCredentials: DRIFT_PRIVILEGES_CLOUD_CREDENTIALS,
    userSshKeys: DRIFT_PRIVILEGES_USER_SSH_KEYS,
    windowsGroups: DRIFT_PRIVILEGES_WINDOWS_GROUPS,
    windowsUserGroups: DRIFT_PRIVILEGES_WINDOWS_USER_GROUPS,
    sharedAccounts: DRIFT_PRIVILEGES_SHARED_ACCOUNTS,
  },
  persistence: {
    servicesWindows: DRIFT_PERSISTENCE_SERVICES_WINDOWS,
    startupItems: DRIFT_PERSISTENCE_STARTUP_ITEMS,
    systemdCustomUnits: DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS,
    cronExternal: DRIFT_PERSISTENCE_CRON_EXTERNAL,
    scheduledTasks: DRIFT_PERSISTENCE_SCHEDULED_TASKS,
    launchd: DRIFT_PERSISTENCE_LAUNCHD,
    unusualKernelModules: DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES,
    registryRunKeys: DRIFT_PERSISTENCE_REGISTRY_RUN_KEYS,
    wmiSubscriptions: DRIFT_PERSISTENCE_WMI_SUBSCRIPTIONS,
    cronAll: DRIFT_PERSISTENCE_CRON_ALL,
    atJobs: DRIFT_PERSISTENCE_AT_JOBS,
    browserExtensionsRisky: DRIFT_PERSISTENCE_BROWSER_EXTENSIONS_RISKY,
    officeAddins: DRIFT_PERSISTENCE_OFFICE_ADDINS,
  },
  network: {
    listeningPorts: DRIFT_NETWORK_LISTENING_PORTS,
    customSmbShares: DRIFT_NETWORK_CUSTOM_SMB_SHARES,
    hostsFile: DRIFT_NETWORK_HOSTS_FILE,
    dnsResolvers: DRIFT_NETWORK_DNS_RESOLVERS,
    interfaces: DRIFT_NETWORK_INTERFACES,
    routes: DRIFT_NETWORK_ROUTES,
    arpCache: DRIFT_NETWORK_ARP_CACHE,
    establishedConnections: DRIFT_NETWORK_ESTABLISHED_CONNECTIONS,
    wifiNetworks: DRIFT_NETWORK_WIFI_NETWORKS,
    proxySettings: DRIFT_NETWORK_PROXY_SETTINGS,
  },
  software: {
    programsWindows: DRIFT_SOFTWARE_PROGRAMS_WINDOWS,
    debPackages: DRIFT_SOFTWARE_DEB,
    rpmPackages: DRIFT_SOFTWARE_RPM,
    appsMacOS: DRIFT_SOFTWARE_APPS_MACOS,
    chromeExtensions: DRIFT_SOFTWARE_CHROME_EXTENSIONS,
    firefoxAddons: DRIFT_SOFTWARE_FIREFOX_ADDONS,
    pythonPackages: DRIFT_SOFTWARE_PYTHON_PACKAGES,
    npmPackages: DRIFT_SOFTWARE_NPM_PACKAGES,
    homebrew: DRIFT_SOFTWARE_HOMEBREW,
    windowsFeatures: DRIFT_SOFTWARE_WINDOWS_FEATURES,
    kernelExtensions: DRIFT_SOFTWARE_KERNEL_EXTENSIONS,
    edgeExtensions: DRIFT_SOFTWARE_EDGE_EXTENSIONS,
  },
  posture: {
    diskEncryption: DRIFT_POSTURE_DISK_ENCRYPTION,
    firewallMacOS: DRIFT_POSTURE_FIREWALL_MACOS,
    firewallLinux: DRIFT_POSTURE_FIREWALL_LINUX,
    firewallWindows: DRIFT_POSTURE_FIREWALL_WINDOWS,
    secureBoot: DRIFT_POSTURE_SECURE_BOOT,
    windowsDefender: DRIFT_POSTURE_WINDOWS_DEFENDER,
    sipMacOS: DRIFT_POSTURE_SIP_MACOS,
    gatekeeperMacOS: DRIFT_POSTURE_GATEKEEPER_MACOS,
    selinux: DRIFT_POSTURE_SELINUX,
    sshConfig: DRIFT_POSTURE_SSH_CONFIG,
    kernelHardening: DRIFT_POSTURE_KERNEL_HARDENING,
    passwordPolicyWindows: DRIFT_POSTURE_PASSWORD_POLICY_WINDOWS,
    autoUpdatesWindows: DRIFT_POSTURE_AUTO_UPDATES_WINDOWS,
    rdpEnabled: DRIFT_POSTURE_RDP_ENABLED,
    screenLock: DRIFT_POSTURE_SCREEN_LOCK,
    auditPolicy: DRIFT_POSTURE_AUDIT_POLICY,
    credentialGuard: DRIFT_POSTURE_CREDENTIAL_GUARD,
    uacSettings: DRIFT_POSTURE_UAC_SETTINGS,
    apparmor: DRIFT_POSTURE_APPARMOR,
    timeSync: DRIFT_POSTURE_TIME_SYNC,
  },
  certificates: {
    systemCa: DRIFT_CERTIFICATES_SYSTEM_CA,
    windowsStore: DRIFT_CERTIFICATES_WINDOWS_STORE,
    untrusted: DRIFT_CERTIFICATES_UNTRUSTED,
    expiring: DRIFT_CERTIFICATES_EXPIRING,
  },
  hardware: {
    systemInfo: DRIFT_HARDWARE_SYSTEM_INFO,
    cpuInfo: DRIFT_HARDWARE_CPU_INFO,
    physicalDisks: DRIFT_HARDWARE_PHYSICAL_DISKS,
    usbDevices: DRIFT_HARDWARE_USB_DEVICES,
    pciDevices: DRIFT_HARDWARE_PCI_DEVICES,
  },
  runtime: {
    highPrivilegeProcesses: DRIFT_RUNTIME_HIGH_PRIVILEGE_PROCESSES,
    processOpenFiles: DRIFT_RUNTIME_PROCESS_OPEN_FILES,
    mounts: DRIFT_RUNTIME_MOUNTS,
    dockerContainers: DRIFT_RUNTIME_DOCKER_CONTAINERS,
    envVars: DRIFT_RUNTIME_ENV_VARS,
    memoryMaps: DRIFT_RUNTIME_MEMORY_MAPS,
  },
} as const;

/**
 * Get all drift queries as a flat array
 */
export const getAllDriftQueries = (): DriftQuery[] => [
  // Privileges
  DRIFT_PRIVILEGES_LOCAL_ADMINS,
  DRIFT_PRIVILEGES_USERS,
  DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
  DRIFT_PRIVILEGES_SUDOERS_RULES,
  DRIFT_PRIVILEGES_SSH_AUTHORIZED_KEYS,
  DRIFT_PRIVILEGES_SUID_BINARIES,
  DRIFT_PRIVILEGES_ACTIVE_SESSIONS,
  DRIFT_PRIVILEGES_LOGON_SESSIONS_WINDOWS,
  DRIFT_PRIVILEGES_CLOUD_CREDENTIALS,
  DRIFT_PRIVILEGES_USER_SSH_KEYS,
  DRIFT_PRIVILEGES_WINDOWS_GROUPS,
  DRIFT_PRIVILEGES_WINDOWS_USER_GROUPS,
  DRIFT_PRIVILEGES_SHARED_ACCOUNTS,
  // Persistence
  DRIFT_PERSISTENCE_SERVICES_WINDOWS,
  DRIFT_PERSISTENCE_STARTUP_ITEMS,
  DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS,
  DRIFT_PERSISTENCE_CRON_EXTERNAL,
  DRIFT_PERSISTENCE_SCHEDULED_TASKS,
  DRIFT_PERSISTENCE_LAUNCHD,
  DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES,
  DRIFT_PERSISTENCE_REGISTRY_RUN_KEYS,
  DRIFT_PERSISTENCE_WMI_SUBSCRIPTIONS,
  DRIFT_PERSISTENCE_CRON_ALL,
  DRIFT_PERSISTENCE_AT_JOBS,
  DRIFT_PERSISTENCE_BROWSER_EXTENSIONS_RISKY,
  DRIFT_PERSISTENCE_OFFICE_ADDINS,
  // Network
  DRIFT_NETWORK_LISTENING_PORTS,
  DRIFT_NETWORK_CUSTOM_SMB_SHARES,
  DRIFT_NETWORK_HOSTS_FILE,
  DRIFT_NETWORK_DNS_RESOLVERS,
  DRIFT_NETWORK_INTERFACES,
  DRIFT_NETWORK_ROUTES,
  DRIFT_NETWORK_ARP_CACHE,
  DRIFT_NETWORK_ESTABLISHED_CONNECTIONS,
  DRIFT_NETWORK_WIFI_NETWORKS,
  DRIFT_NETWORK_PROXY_SETTINGS,
  // Software
  DRIFT_SOFTWARE_PROGRAMS_WINDOWS,
  DRIFT_SOFTWARE_DEB,
  DRIFT_SOFTWARE_RPM,
  DRIFT_SOFTWARE_APPS_MACOS,
  DRIFT_SOFTWARE_CHROME_EXTENSIONS,
  DRIFT_SOFTWARE_FIREFOX_ADDONS,
  DRIFT_SOFTWARE_PYTHON_PACKAGES,
  DRIFT_SOFTWARE_NPM_PACKAGES,
  DRIFT_SOFTWARE_HOMEBREW,
  DRIFT_SOFTWARE_WINDOWS_FEATURES,
  DRIFT_SOFTWARE_KERNEL_EXTENSIONS,
  DRIFT_SOFTWARE_EDGE_EXTENSIONS,
  // Posture
  DRIFT_POSTURE_DISK_ENCRYPTION,
  DRIFT_POSTURE_FIREWALL_LINUX,
  DRIFT_POSTURE_FIREWALL_MACOS,
  DRIFT_POSTURE_FIREWALL_WINDOWS,
  DRIFT_POSTURE_SECURE_BOOT,
  DRIFT_POSTURE_WINDOWS_DEFENDER,
  DRIFT_POSTURE_SIP_MACOS,
  DRIFT_POSTURE_GATEKEEPER_MACOS,
  DRIFT_POSTURE_SELINUX,
  DRIFT_POSTURE_SSH_CONFIG,
  DRIFT_POSTURE_KERNEL_HARDENING,
  DRIFT_POSTURE_PASSWORD_POLICY_WINDOWS,
  DRIFT_POSTURE_AUTO_UPDATES_WINDOWS,
  DRIFT_POSTURE_RDP_ENABLED,
  DRIFT_POSTURE_SCREEN_LOCK,
  DRIFT_POSTURE_AUDIT_POLICY,
  DRIFT_POSTURE_CREDENTIAL_GUARD,
  DRIFT_POSTURE_UAC_SETTINGS,
  DRIFT_POSTURE_APPARMOR,
  DRIFT_POSTURE_TIME_SYNC,
  // Certificates
  DRIFT_CERTIFICATES_SYSTEM_CA,
  DRIFT_CERTIFICATES_WINDOWS_STORE,
  DRIFT_CERTIFICATES_UNTRUSTED,
  DRIFT_CERTIFICATES_EXPIRING,
  // Hardware
  DRIFT_HARDWARE_SYSTEM_INFO,
  DRIFT_HARDWARE_CPU_INFO,
  DRIFT_HARDWARE_PHYSICAL_DISKS,
  DRIFT_HARDWARE_USB_DEVICES,
  DRIFT_HARDWARE_PCI_DEVICES,
  // Runtime
  DRIFT_RUNTIME_HIGH_PRIVILEGE_PROCESSES,
  DRIFT_RUNTIME_PROCESS_OPEN_FILES,
  DRIFT_RUNTIME_MOUNTS,
  DRIFT_RUNTIME_DOCKER_CONTAINERS,
  DRIFT_RUNTIME_ENV_VARS,
  DRIFT_RUNTIME_MEMORY_MAPS,
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
      // Privileges
      DRIFT_PRIVILEGES_LOCAL_ADMINS,
      DRIFT_PRIVILEGES_USERS,
      DRIFT_PRIVILEGES_LOGON_SESSIONS_WINDOWS,
      DRIFT_PRIVILEGES_WINDOWS_GROUPS,
      DRIFT_PRIVILEGES_WINDOWS_USER_GROUPS,
      // Persistence
      DRIFT_PERSISTENCE_SERVICES_WINDOWS,
      DRIFT_PERSISTENCE_STARTUP_ITEMS,
      DRIFT_PERSISTENCE_SCHEDULED_TASKS,
      DRIFT_PERSISTENCE_REGISTRY_RUN_KEYS,
      DRIFT_PERSISTENCE_WMI_SUBSCRIPTIONS,
      DRIFT_PERSISTENCE_BROWSER_EXTENSIONS_RISKY,
      DRIFT_PERSISTENCE_OFFICE_ADDINS,
      // Network
      DRIFT_NETWORK_LISTENING_PORTS,
      DRIFT_NETWORK_CUSTOM_SMB_SHARES,
      DRIFT_NETWORK_HOSTS_FILE,
      DRIFT_NETWORK_DNS_RESOLVERS,
      DRIFT_NETWORK_INTERFACES,
      DRIFT_NETWORK_ROUTES,
      DRIFT_NETWORK_ARP_CACHE,
      DRIFT_NETWORK_ESTABLISHED_CONNECTIONS,
      DRIFT_NETWORK_WIFI_NETWORKS,
      DRIFT_NETWORK_PROXY_SETTINGS,
      // Software
      DRIFT_SOFTWARE_PROGRAMS_WINDOWS,
      DRIFT_SOFTWARE_CHROME_EXTENSIONS,
      DRIFT_SOFTWARE_FIREFOX_ADDONS,
      DRIFT_SOFTWARE_PYTHON_PACKAGES,
      DRIFT_SOFTWARE_NPM_PACKAGES,
      DRIFT_SOFTWARE_WINDOWS_FEATURES,
      DRIFT_SOFTWARE_EDGE_EXTENSIONS,
      // Posture
      DRIFT_POSTURE_DISK_ENCRYPTION,
      DRIFT_POSTURE_FIREWALL_WINDOWS,
      DRIFT_POSTURE_SECURE_BOOT,
      DRIFT_POSTURE_WINDOWS_DEFENDER,
      DRIFT_POSTURE_PASSWORD_POLICY_WINDOWS,
      DRIFT_POSTURE_AUTO_UPDATES_WINDOWS,
      DRIFT_POSTURE_RDP_ENABLED,
      DRIFT_POSTURE_SCREEN_LOCK,
      DRIFT_POSTURE_AUDIT_POLICY,
      DRIFT_POSTURE_CREDENTIAL_GUARD,
      DRIFT_POSTURE_UAC_SETTINGS,
      // Certificates
      DRIFT_CERTIFICATES_WINDOWS_STORE,
      DRIFT_CERTIFICATES_UNTRUSTED,
      DRIFT_CERTIFICATES_EXPIRING,
      // Hardware
      DRIFT_HARDWARE_SYSTEM_INFO,
      DRIFT_HARDWARE_CPU_INFO,
      DRIFT_HARDWARE_PHYSICAL_DISKS,
      DRIFT_HARDWARE_USB_DEVICES
    );
  } else if (platform === 'linux') {
    queries.push(
      // Privileges
      DRIFT_PRIVILEGES_LOCAL_ADMINS,
      DRIFT_PRIVILEGES_USERS,
      DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
      DRIFT_PRIVILEGES_SUDOERS_RULES,
      DRIFT_PRIVILEGES_SSH_AUTHORIZED_KEYS,
      DRIFT_PRIVILEGES_SUID_BINARIES,
      DRIFT_PRIVILEGES_ACTIVE_SESSIONS,
      DRIFT_PRIVILEGES_CLOUD_CREDENTIALS,
      DRIFT_PRIVILEGES_USER_SSH_KEYS,
      DRIFT_PRIVILEGES_SHARED_ACCOUNTS,
      // Persistence
      DRIFT_PERSISTENCE_STARTUP_ITEMS,
      DRIFT_PERSISTENCE_SYSTEMD_CUSTOM_UNITS,
      DRIFT_PERSISTENCE_CRON_EXTERNAL,
      DRIFT_PERSISTENCE_UNUSUAL_KERNEL_MODULES,
      DRIFT_PERSISTENCE_CRON_ALL,
      DRIFT_PERSISTENCE_AT_JOBS,
      DRIFT_PERSISTENCE_BROWSER_EXTENSIONS_RISKY,
      // Network
      DRIFT_NETWORK_LISTENING_PORTS,
      DRIFT_NETWORK_HOSTS_FILE,
      DRIFT_NETWORK_DNS_RESOLVERS,
      DRIFT_NETWORK_INTERFACES,
      DRIFT_NETWORK_ROUTES,
      DRIFT_NETWORK_ARP_CACHE,
      DRIFT_NETWORK_ESTABLISHED_CONNECTIONS,
      // Software
      DRIFT_SOFTWARE_DEB,
      DRIFT_SOFTWARE_RPM,
      DRIFT_SOFTWARE_CHROME_EXTENSIONS,
      DRIFT_SOFTWARE_FIREFOX_ADDONS,
      DRIFT_SOFTWARE_PYTHON_PACKAGES,
      DRIFT_SOFTWARE_NPM_PACKAGES,
      DRIFT_SOFTWARE_EDGE_EXTENSIONS,
      // Posture
      DRIFT_POSTURE_DISK_ENCRYPTION,
      DRIFT_POSTURE_FIREWALL_LINUX,
      DRIFT_POSTURE_SELINUX,
      DRIFT_POSTURE_SSH_CONFIG,
      DRIFT_POSTURE_KERNEL_HARDENING,
      DRIFT_POSTURE_APPARMOR,
      DRIFT_POSTURE_TIME_SYNC,
      // Certificates
      DRIFT_CERTIFICATES_SYSTEM_CA,
      DRIFT_CERTIFICATES_EXPIRING,
      // Hardware
      DRIFT_HARDWARE_SYSTEM_INFO,
      DRIFT_HARDWARE_CPU_INFO,
      DRIFT_HARDWARE_PHYSICAL_DISKS,
      DRIFT_HARDWARE_USB_DEVICES,
      DRIFT_HARDWARE_PCI_DEVICES,
      // Runtime
      DRIFT_RUNTIME_HIGH_PRIVILEGE_PROCESSES,
      DRIFT_RUNTIME_PROCESS_OPEN_FILES,
      DRIFT_RUNTIME_MOUNTS,
      DRIFT_RUNTIME_DOCKER_CONTAINERS,
      DRIFT_RUNTIME_ENV_VARS,
      DRIFT_RUNTIME_MEMORY_MAPS
    );
  } else if (platform === 'darwin') {
    queries.push(
      // Privileges
      DRIFT_PRIVILEGES_LOCAL_ADMINS,
      DRIFT_PRIVILEGES_USERS,
      DRIFT_PRIVILEGES_PRIVILEGED_GROUP_MEMBERSHIP,
      DRIFT_PRIVILEGES_SUDOERS_RULES,
      DRIFT_PRIVILEGES_SSH_AUTHORIZED_KEYS,
      DRIFT_PRIVILEGES_SUID_BINARIES,
      DRIFT_PRIVILEGES_ACTIVE_SESSIONS,
      DRIFT_PRIVILEGES_CLOUD_CREDENTIALS,
      DRIFT_PRIVILEGES_USER_SSH_KEYS,
      DRIFT_PRIVILEGES_SHARED_ACCOUNTS,
      // Persistence
      DRIFT_PERSISTENCE_STARTUP_ITEMS,
      DRIFT_PERSISTENCE_CRON_EXTERNAL,
      DRIFT_PERSISTENCE_LAUNCHD,
      DRIFT_PERSISTENCE_CRON_ALL,
      DRIFT_PERSISTENCE_BROWSER_EXTENSIONS_RISKY,
      // Network
      DRIFT_NETWORK_LISTENING_PORTS,
      DRIFT_NETWORK_HOSTS_FILE,
      DRIFT_NETWORK_DNS_RESOLVERS,
      DRIFT_NETWORK_INTERFACES,
      DRIFT_NETWORK_ROUTES,
      DRIFT_NETWORK_ARP_CACHE,
      DRIFT_NETWORK_ESTABLISHED_CONNECTIONS,
      DRIFT_NETWORK_WIFI_NETWORKS,
      // Software
      DRIFT_SOFTWARE_APPS_MACOS,
      DRIFT_SOFTWARE_CHROME_EXTENSIONS,
      DRIFT_SOFTWARE_FIREFOX_ADDONS,
      DRIFT_SOFTWARE_PYTHON_PACKAGES,
      DRIFT_SOFTWARE_NPM_PACKAGES,
      DRIFT_SOFTWARE_HOMEBREW,
      DRIFT_SOFTWARE_KERNEL_EXTENSIONS,
      DRIFT_SOFTWARE_EDGE_EXTENSIONS,
      // Posture
      DRIFT_POSTURE_DISK_ENCRYPTION,
      DRIFT_POSTURE_FIREWALL_MACOS,
      DRIFT_POSTURE_SIP_MACOS,
      DRIFT_POSTURE_GATEKEEPER_MACOS,
      DRIFT_POSTURE_SSH_CONFIG,
      // Certificates
      DRIFT_CERTIFICATES_SYSTEM_CA,
      DRIFT_CERTIFICATES_EXPIRING,
      // Hardware
      DRIFT_HARDWARE_SYSTEM_INFO,
      DRIFT_HARDWARE_CPU_INFO,
      DRIFT_HARDWARE_PHYSICAL_DISKS,
      DRIFT_HARDWARE_USB_DEVICES,
      DRIFT_HARDWARE_PCI_DEVICES,
      // Runtime
      DRIFT_RUNTIME_HIGH_PRIVILEGE_PROCESSES,
      DRIFT_RUNTIME_PROCESS_OPEN_FILES,
      DRIFT_RUNTIME_MOUNTS,
      DRIFT_RUNTIME_ENV_VARS
    );
  }

  return queries;
};

/**
 * Get queries by category
 */
export const getDriftQueriesByCategory = (
  category: 'privileges' | 'persistence' | 'network' | 'software' | 'posture' | 'certificates' | 'hardware' | 'runtime'
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
    'Drift detection queries for Endpoint Asset Management. Tracks security-relevant changes across privileges, persistence, network, software, posture, certificates, hardware, and runtime.',
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
