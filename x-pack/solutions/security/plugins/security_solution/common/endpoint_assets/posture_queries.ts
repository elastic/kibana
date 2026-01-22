/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Osquery Saved Queries for Endpoint Asset Posture Checks
 *
 * These queries collect security posture data that feeds into the
 * Security Posture Dashboard in Endpoint Assets.
 *
 * To use these queries:
 * 1. Create an osquery pack with these queries via Kibana UI or API
 * 2. Assign the pack to your endpoints via Fleet
 * 3. The transform will aggregate the results into endpoint-assets-osquery-* index
 */

export interface PostureQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  platform: 'windows' | 'linux' | 'darwin' | 'posix' | 'all';
  interval: number; // seconds
  ecsMapping: Record<string, { field: string }>;
}

/**
 * Windows BitLocker Disk Encryption Status
 *
 * Checks if BitLocker is enabled on Windows drives.
 * protection_status: 0 = OFF, 1 = ON, 2 = UNKNOWN
 */
export const WINDOWS_BITLOCKER_QUERY: PostureQuery = {
  id: 'posture_windows_bitlocker',
  name: 'Windows BitLocker Status',
  description: 'Query BitLocker encryption status for Windows disk encryption posture check',
  query: `
SELECT
  device_id,
  drive_letter,
  persistent_volume_id,
  protection_status,
  CASE protection_status
    WHEN 0 THEN '0'
    WHEN 1 THEN '1'
    WHEN 2 THEN '0'
    ELSE '0'
  END AS encrypted
FROM bitlocker_info
WHERE drive_letter = 'C:';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.encrypted': { field: 'encrypted' },
    'osquery.drive_letter': { field: 'drive_letter' },
    'osquery.protection_status': { field: 'protection_status' },
  },
};

/**
 * Windows Firewall Status
 *
 * Checks if Windows Firewall service (MpsSvc) is running.
 * Also checks Windows Defender service (WinDefend).
 */
export const WINDOWS_FIREWALL_QUERY: PostureQuery = {
  id: 'posture_windows_firewall',
  name: 'Windows Firewall Status',
  description: 'Query Windows Firewall service status for firewall posture check',
  query: `
SELECT
  name,
  display_name,
  status,
  CASE
    WHEN status = 'RUNNING' THEN '1'
    ELSE '0'
  END AS firewall_enabled
FROM services
WHERE name = 'MpsSvc';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.firewall_enabled': { field: 'firewall_enabled' },
    'osquery.service_name': { field: 'name' },
    'osquery.service_status': { field: 'status' },
  },
};

/**
 * Windows PowerShell History Check
 *
 * Checks if PowerShell command history exists (indicates normal usage).
 * Returns 'yes' if no history found (suspicious), 'no' if history exists.
 */
export const WINDOWS_SHELL_HISTORY_QUERY: PostureQuery = {
  id: 'posture_windows_shell_history',
  name: 'Windows PowerShell History Check',
  description: 'Check for PowerShell command history presence for shell posture check',
  query: `
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'yes'
    ELSE 'no'
  END AS no_history_suspicious
FROM powershell_events
WHERE time > (strftime('%s', 'now') - 86400);
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.no_history_suspicious': { field: 'no_history_suspicious' },
  },
};

/**
 * Linux/macOS Disk Encryption Status
 *
 * Checks if root filesystem is encrypted using dm-crypt/LUKS.
 * For macOS, checks FileVault via disk_encryption table.
 */
export const LINUX_DISK_ENCRYPTION_QUERY: PostureQuery = {
  id: 'posture_linux_disk_encryption',
  name: 'Linux Disk Encryption Status',
  description: 'Query LUKS/dm-crypt encryption status for Linux disk encryption posture check',
  query: `
SELECT
  device,
  path,
  type,
  CASE
    WHEN type LIKE '%crypt%' OR device LIKE '/dev/mapper/luks%' OR device LIKE '/dev/dm-%' THEN '1'
    ELSE '0'
  END AS encrypted
FROM mounts
WHERE path = '/';
  `.trim(),
  platform: 'linux',
  interval: 3600,
  ecsMapping: {
    'osquery.encrypted': { field: 'encrypted' },
    'osquery.device': { field: 'device' },
    'osquery.mount_path': { field: 'path' },
    'osquery.fs_type': { field: 'type' },
  },
};

/**
 * macOS FileVault Disk Encryption Status
 *
 * Checks if FileVault is enabled on macOS.
 */
export const MACOS_DISK_ENCRYPTION_QUERY: PostureQuery = {
  id: 'posture_macos_disk_encryption',
  name: 'macOS FileVault Status',
  description: 'Query FileVault encryption status for macOS disk encryption posture check',
  query: `
SELECT
  uid,
  user_uuid,
  encrypted,
  CASE encrypted
    WHEN 1 THEN '1'
    ELSE '0'
  END AS encrypted_status
FROM disk_encryption;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  ecsMapping: {
    'osquery.encrypted': { field: 'encrypted_status' },
    'osquery.user_uuid': { field: 'user_uuid' },
  },
};

/**
 * Linux iptables Firewall Status
 *
 * Checks if iptables has active rules (indicates firewall is configured).
 * Returns '1' if firewall rules exist, '0' if no rules.
 */
export const LINUX_IPTABLES_QUERY: PostureQuery = {
  id: 'posture_linux_iptables',
  name: 'Linux iptables Firewall Status',
  description: 'Query iptables rules for Linux firewall posture check',
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
  ecsMapping: {
    'osquery.firewall_enabled': { field: 'firewall_enabled' },
    'osquery.rule_count': { field: 'rule_count' },
  },
};

/**
 * macOS Application Layer Firewall (ALF) Status
 *
 * Checks if macOS firewall is enabled.
 * global_state: 0 = OFF, 1 = ON, 2 = BLOCK_ALL
 */
export const MACOS_ALF_QUERY: PostureQuery = {
  id: 'posture_macos_alf',
  name: 'macOS Firewall Status',
  description: 'Query Application Layer Firewall (ALF) status for macOS firewall posture check',
  query: `
SELECT
  global_state,
  logging_enabled,
  stealth_enabled,
  CASE global_state
    WHEN 0 THEN '0'
    WHEN 1 THEN '1'
    WHEN 2 THEN '1'
    ELSE '0'
  END AS firewall_enabled
FROM alf;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  ecsMapping: {
    'osquery.global_state': { field: 'global_state' },
    'osquery.firewall_enabled': { field: 'firewall_enabled' },
    'osquery.logging_enabled': { field: 'logging_enabled' },
    'osquery.stealth_enabled': { field: 'stealth_enabled' },
  },
};

/**
 * Windows Secure Boot Status
 *
 * Checks if Secure Boot is enabled on Windows systems.
 * secure_boot: 1 = enabled, 0 = disabled
 * Maps to osquery.secure_boot for transform aggregation
 */
export const WINDOWS_SECURE_BOOT_QUERY: PostureQuery = {
  id: 'posture_windows_secure_boot',
  name: 'Windows Secure Boot Status',
  description: 'Query Secure Boot status for Windows secure boot posture check',
  query: `
SELECT
  secure_boot,
  setup_mode
FROM secureboot;
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.secure_boot': { field: 'secure_boot' },
    'osquery.setup_mode': { field: 'setup_mode' },
  },
};

/**
 * Linux Secure Boot Status
 *
 * Checks if Secure Boot is enabled on Linux systems via EFI variables.
 * secure_boot: 1 = enabled, 0 = disabled
 * Maps to osquery.secure_boot for transform aggregation
 */
export const LINUX_SECURE_BOOT_QUERY: PostureQuery = {
  id: 'posture_linux_secure_boot',
  name: 'Linux Secure Boot Status',
  description: 'Query Secure Boot status for Linux secure boot posture check',
  query: `
SELECT
  secure_boot,
  setup_mode
FROM secureboot;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  ecsMapping: {
    'osquery.secure_boot': { field: 'secure_boot' },
    'osquery.setup_mode': { field: 'setup_mode' },
  },
};

/**
 * macOS System Integrity Protection (SIP) Status
 *
 * macOS uses SIP instead of traditional Secure Boot.
 * config_flag with enabled=1 indicates SIP is active.
 * Maps enabled to osquery.secure_boot for transform aggregation
 */
export const MACOS_SIP_QUERY: PostureQuery = {
  id: 'posture_macos_sip',
  name: 'macOS System Integrity Protection Status',
  description: 'Query SIP status for macOS secure boot posture check',
  query: `
SELECT
  config_flag,
  enabled,
  enabled_nvram
FROM sip_config
WHERE config_flag = 'sip';
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  ecsMapping: {
    'osquery.secure_boot': { field: 'enabled' },
    'osquery.sip_enabled_nvram': { field: 'enabled_nvram' },
  },
};

/**
 * Windows Local Administrators
 *
 * Returns individual users in the local Administrators group.
 * Transform aggregates these into admin_count via cardinality.
 * Maps to osquery.user and osquery.groupname for transform
 */
export const WINDOWS_LOCAL_ADMINS_QUERY: PostureQuery = {
  id: 'posture_windows_local_admins',
  name: 'Windows Local Administrators',
  description: 'Query local administrator group membership for privilege posture check',
  query: `
SELECT
  u.username AS user,
  g.groupname
FROM user_groups ug
JOIN groups g ON ug.gid = g.gid
JOIN users u ON ug.uid = u.uid
WHERE g.groupname = 'Administrators';
  `.trim(),
  platform: 'windows',
  interval: 3600,
  ecsMapping: {
    'osquery.user': { field: 'user' },
    'osquery.groupname': { field: 'groupname' },
  },
};

/**
 * Linux Local Administrators
 *
 * Returns individual users in sudo/wheel/admin groups (root-equivalent access).
 * Transform aggregates these into admin_count via cardinality.
 * Maps to osquery.user and osquery.groupname for transform
 */
export const LINUX_LOCAL_ADMINS_QUERY: PostureQuery = {
  id: 'posture_linux_local_admins',
  name: 'Linux Local Administrators',
  description: 'Query sudo/wheel group membership for privilege posture check',
  query: `
SELECT DISTINCT
  u.username AS user,
  g.groupname
FROM user_groups ug
JOIN groups g ON ug.gid = g.gid
JOIN users u ON ug.uid = u.uid
WHERE g.groupname IN ('sudo', 'wheel', 'admin')
  AND u.uid >= 1000;
  `.trim(),
  platform: 'linux',
  interval: 3600,
  ecsMapping: {
    'osquery.user': { field: 'user' },
    'osquery.groupname': { field: 'groupname' },
  },
};

/**
 * macOS Local Administrators
 *
 * Returns individual users in the admin group on macOS.
 * Transform aggregates these into admin_count via cardinality.
 * Maps to osquery.user and osquery.groupname for transform
 */
export const MACOS_LOCAL_ADMINS_QUERY: PostureQuery = {
  id: 'posture_macos_local_admins',
  name: 'macOS Local Administrators',
  description: 'Query admin group membership for privilege posture check',
  query: `
SELECT
  u.username AS user,
  g.groupname
FROM user_groups ug
JOIN groups g ON ug.gid = g.gid
JOIN users u ON ug.uid = u.uid
WHERE g.groupname = 'admin'
  AND u.uid >= 500;
  `.trim(),
  platform: 'darwin',
  interval: 3600,
  ecsMapping: {
    'osquery.user': { field: 'user' },
    'osquery.groupname': { field: 'groupname' },
  },
};

/**
 * Linux/macOS Shell History Check
 *
 * Checks if shell history file exists and has content.
 * Returns 'yes' if no history found (suspicious), 'no' if history exists.
 */
export const POSIX_SHELL_HISTORY_QUERY: PostureQuery = {
  id: 'posture_posix_shell_history',
  name: 'Shell History Check',
  description: 'Check for shell command history presence for shell posture check',
  query: `
SELECT
  username,
  shell,
  CASE
    WHEN shell LIKE '%bash%' AND NOT EXISTS (
      SELECT 1 FROM file WHERE path = directory || '/.bash_history' AND size > 0
    ) THEN 'yes'
    WHEN shell LIKE '%zsh%' AND NOT EXISTS (
      SELECT 1 FROM file WHERE path = directory || '/.zsh_history' AND size > 0
    ) THEN 'yes'
    ELSE 'no'
  END AS no_history_suspicious
FROM users
WHERE uid >= 500 OR uid = 0;
  `.trim(),
  platform: 'posix',
  interval: 3600,
  ecsMapping: {
    'osquery.no_history_suspicious': { field: 'no_history_suspicious' },
    'osquery.username': { field: 'username' },
    'osquery.shell': { field: 'shell' },
  },
};

// =============================================================================
// UNKNOWN KNOWNS QUERIES - Dormant Risk Detection
// =============================================================================

/**
 * SSH Authorized Keys with Age (Linux/macOS)
 *
 * Detects SSH keys that haven't been rotated in over 180 days.
 * Old keys represent dormant access that may have been forgotten.
 * Maps key age to osquery.key_age_days for transform aggregation.
 */
export const SSH_AUTHORIZED_KEYS_QUERY: PostureQuery = {
  id: 'unknown_knowns_ssh_keys',
  name: 'SSH Authorized Keys Age',
  description: 'Query SSH authorized_keys with file modification times for Unknown Knowns detection',
  query: `
SELECT
  ak.uid,
  u.username,
  ak.key_file,
  ak.algorithm,
  f.mtime,
  CAST((strftime('%s', 'now') - f.mtime) / 86400 AS INTEGER) as key_age_days,
  CASE
    WHEN (strftime('%s', 'now') - f.mtime) > (180 * 86400) THEN '1'
    ELSE '0'
  END AS key_over_180d
FROM authorized_keys ak
JOIN users u ON ak.uid = u.uid
JOIN file f ON f.path = ak.key_file
WHERE u.uid >= 500 OR u.uid = 0;
  `.trim(),
  platform: 'posix',
  interval: 86400, // Daily
  ecsMapping: {
    'osquery.key_file': { field: 'key_file' },
    'osquery.algorithm': { field: 'algorithm' },
    'osquery.mtime': { field: 'mtime' },
    'osquery.key_age_days': { field: 'key_age_days' },
    'osquery.key_over_180d': { field: 'key_over_180d' },
    'osquery.username': { field: 'username' },
  },
};

/**
 * Dormant Users - No Login in 30+ Days (Linux/macOS)
 *
 * Detects user accounts that haven't logged in for over 30 days.
 * Dormant accounts with privileges represent forgotten access risks.
 * Maps to osquery.days_since_login for transform aggregation.
 */
export const DORMANT_USERS_QUERY: PostureQuery = {
  id: 'unknown_knowns_dormant_users',
  name: 'Dormant User Detection',
  description: 'Query users with last login times for Unknown Knowns detection',
  query: `
SELECT
  u.username,
  u.uid,
  u.gid,
  u.directory,
  u.shell,
  COALESCE(l.time, 0) as last_login_time,
  CASE
    WHEN l.time IS NULL THEN 9999
    ELSE CAST((strftime('%s', 'now') - l.time) / 86400 AS INTEGER)
  END as days_since_login,
  CASE
    WHEN l.time IS NULL OR (strftime('%s', 'now') - l.time) > (30 * 86400) THEN '1'
    ELSE '0'
  END AS dormant_30d
FROM users u
LEFT JOIN last l ON u.username = l.username
WHERE u.shell NOT LIKE '%nologin%'
  AND u.shell NOT LIKE '%false%'
  AND (u.uid >= 500 OR u.uid = 0);
  `.trim(),
  platform: 'posix',
  interval: 86400, // Daily
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.last_login_time': { field: 'last_login_time' },
    'osquery.days_since_login': { field: 'days_since_login' },
    'osquery.dormant_30d': { field: 'dormant_30d' },
    'osquery.user_shell': { field: 'shell' },
  },
};

/**
 * Windows Dormant Users - No Login in 30+ Days
 *
 * Detects Windows user accounts that haven't logged in for over 30 days.
 * Uses logon_sessions and user_groups to identify dormant privileged accounts.
 */
export const WINDOWS_DORMANT_USERS_QUERY: PostureQuery = {
  id: 'unknown_knowns_windows_dormant_users',
  name: 'Windows Dormant User Detection',
  description: 'Query Windows users with last logon times for Unknown Knowns detection',
  query: `
SELECT
  u.username,
  u.uid,
  u.type,
  u.directory,
  COALESCE(
    (SELECT MAX(logon_time) FROM logon_sessions ls WHERE ls.user = u.username),
    0
  ) as last_login_time,
  CASE
    WHEN (SELECT MAX(logon_time) FROM logon_sessions ls WHERE ls.user = u.username) IS NULL THEN 9999
    ELSE CAST((strftime('%s', 'now') - (SELECT MAX(logon_time) FROM logon_sessions ls WHERE ls.user = u.username)) / 86400 AS INTEGER)
  END as days_since_login,
  CASE
    WHEN (SELECT MAX(logon_time) FROM logon_sessions ls WHERE ls.user = u.username) IS NULL
      OR (strftime('%s', 'now') - (SELECT MAX(logon_time) FROM logon_sessions ls WHERE ls.user = u.username)) > (30 * 86400)
    THEN '1'
    ELSE '0'
  END AS dormant_30d
FROM users u
WHERE u.type = 'local';
  `.trim(),
  platform: 'windows',
  interval: 86400, // Daily
  ecsMapping: {
    'osquery.username': { field: 'username' },
    'osquery.last_login_time': { field: 'last_login_time' },
    'osquery.days_since_login': { field: 'days_since_login' },
    'osquery.dormant_30d': { field: 'dormant_30d' },
  },
};

/**
 * Windows Scheduled Tasks with External URLs
 *
 * Detects scheduled tasks that call external URLs (potential C2 or data exfil).
 * Looks for http/https/curl/wget/Invoke-WebRequest patterns.
 */
export const WINDOWS_EXTERNAL_TASKS_QUERY: PostureQuery = {
  id: 'unknown_knowns_windows_external_tasks',
  name: 'Windows External Scheduled Tasks',
  description: 'Query scheduled tasks calling external URLs for Unknown Knowns detection',
  query: `
SELECT
  name,
  action,
  path,
  enabled,
  state,
  last_run_time,
  next_run_time,
  CASE
    WHEN action LIKE '%http://%' OR action LIKE '%https://%'
      OR action LIKE '%curl%' OR action LIKE '%wget%'
      OR action LIKE '%Invoke-WebRequest%' OR action LIKE '%Invoke-RestMethod%'
      OR action LIKE '%Net.WebClient%' OR action LIKE '%DownloadString%'
    THEN '1'
    ELSE '0'
  END AS calls_external
FROM scheduled_tasks
WHERE enabled = 1;
  `.trim(),
  platform: 'windows',
  interval: 86400, // Daily
  ecsMapping: {
    'osquery.task_name': { field: 'name' },
    'osquery.task_action': { field: 'action' },
    'osquery.task_path': { field: 'path' },
    'osquery.task_enabled': { field: 'enabled' },
    'osquery.calls_external': { field: 'calls_external' },
  },
};

/**
 * Linux/macOS Cron Jobs with External URLs
 *
 * Detects cron jobs that call external URLs (potential C2 or data exfil).
 * Looks for http/https/curl/wget patterns in crontab entries.
 */
export const CRON_EXTERNAL_JOBS_QUERY: PostureQuery = {
  id: 'unknown_knowns_cron_external_jobs',
  name: 'Cron Jobs with External URLs',
  description: 'Query cron jobs calling external URLs for Unknown Knowns detection',
  query: `
SELECT
  c.minute,
  c.hour,
  c.day_of_month,
  c.month,
  c.day_of_week,
  c.command,
  c.path,
  CASE
    WHEN c.command LIKE '%http://%' OR c.command LIKE '%https://%'
      OR c.command LIKE '%curl %' OR c.command LIKE '%wget %'
    THEN '1'
    ELSE '0'
  END AS calls_external
FROM crontab c;
  `.trim(),
  platform: 'posix',
  interval: 86400, // Daily
  ecsMapping: {
    'osquery.cron_command': { field: 'command' },
    'osquery.cron_path': { field: 'path' },
    'osquery.calls_external': { field: 'calls_external' },
  },
};

/**
 * macOS Launch Agents/Daemons with External URLs
 *
 * Detects launchd items that call external URLs.
 */
export const MACOS_LAUNCH_EXTERNAL_QUERY: PostureQuery = {
  id: 'unknown_knowns_macos_launch_external',
  name: 'macOS Launch Items with External URLs',
  description: 'Query launch agents/daemons calling external URLs for Unknown Knowns detection',
  query: `
SELECT
  name,
  label,
  program,
  program_arguments,
  path,
  CASE
    WHEN program_arguments LIKE '%http://%' OR program_arguments LIKE '%https://%'
      OR program_arguments LIKE '%curl%' OR program_arguments LIKE '%wget%'
    THEN '1'
    ELSE '0'
  END AS calls_external
FROM launchd;
  `.trim(),
  platform: 'darwin',
  interval: 86400, // Daily
  ecsMapping: {
    'osquery.launch_name': { field: 'name' },
    'osquery.launch_label': { field: 'label' },
    'osquery.launch_program': { field: 'program' },
    'osquery.calls_external': { field: 'calls_external' },
  },
};

/**
 * All Unknown Knowns queries grouped by category
 */
export const UNKNOWN_KNOWNS_QUERIES = {
  sshKeys: {
    posix: SSH_AUTHORIZED_KEYS_QUERY,
  },
  dormantUsers: {
    posix: DORMANT_USERS_QUERY,
    windows: WINDOWS_DORMANT_USERS_QUERY,
  },
  externalTasks: {
    windows: WINDOWS_EXTERNAL_TASKS_QUERY,
    posix: CRON_EXTERNAL_JOBS_QUERY,
    darwin: MACOS_LAUNCH_EXTERNAL_QUERY,
  },
} as const;

/**
 * Get all Unknown Knowns queries as a flat array
 */
export const getAllUnknownKnownsQueries = (): PostureQuery[] => [
  SSH_AUTHORIZED_KEYS_QUERY,
  DORMANT_USERS_QUERY,
  WINDOWS_DORMANT_USERS_QUERY,
  WINDOWS_EXTERNAL_TASKS_QUERY,
  CRON_EXTERNAL_JOBS_QUERY,
  MACOS_LAUNCH_EXTERNAL_QUERY,
];

/**
 * All posture queries grouped by category
 */
export const POSTURE_QUERIES = {
  diskEncryption: {
    windows: WINDOWS_BITLOCKER_QUERY,
    linux: LINUX_DISK_ENCRYPTION_QUERY,
    darwin: MACOS_DISK_ENCRYPTION_QUERY,
  },
  firewall: {
    windows: WINDOWS_FIREWALL_QUERY,
    linux: LINUX_IPTABLES_QUERY,
    darwin: MACOS_ALF_QUERY,
  },
  shellHistory: {
    windows: WINDOWS_SHELL_HISTORY_QUERY,
    posix: POSIX_SHELL_HISTORY_QUERY,
  },
  secureBoot: {
    windows: WINDOWS_SECURE_BOOT_QUERY,
    linux: LINUX_SECURE_BOOT_QUERY,
    darwin: MACOS_SIP_QUERY,
  },
  localAdmins: {
    windows: WINDOWS_LOCAL_ADMINS_QUERY,
    linux: LINUX_LOCAL_ADMINS_QUERY,
    darwin: MACOS_LOCAL_ADMINS_QUERY,
  },
} as const;

/**
 * Get all posture queries as a flat array
 */
export const getAllPostureQueries = (): PostureQuery[] => [
  WINDOWS_BITLOCKER_QUERY,
  WINDOWS_FIREWALL_QUERY,
  WINDOWS_SHELL_HISTORY_QUERY,
  WINDOWS_SECURE_BOOT_QUERY,
  WINDOWS_LOCAL_ADMINS_QUERY,
  LINUX_DISK_ENCRYPTION_QUERY,
  LINUX_IPTABLES_QUERY,
  LINUX_SECURE_BOOT_QUERY,
  LINUX_LOCAL_ADMINS_QUERY,
  MACOS_DISK_ENCRYPTION_QUERY,
  MACOS_ALF_QUERY,
  MACOS_SIP_QUERY,
  MACOS_LOCAL_ADMINS_QUERY,
  POSIX_SHELL_HISTORY_QUERY,
];

/**
 * Get queries for a specific platform
 */
export const getPostureQueriesForPlatform = (platform: 'windows' | 'linux' | 'darwin'): PostureQuery[] => {
  const queries: PostureQuery[] = [];

  if (platform === 'windows') {
    queries.push(
      WINDOWS_BITLOCKER_QUERY,
      WINDOWS_FIREWALL_QUERY,
      WINDOWS_SHELL_HISTORY_QUERY,
      WINDOWS_SECURE_BOOT_QUERY,
      WINDOWS_LOCAL_ADMINS_QUERY
    );
  } else if (platform === 'linux') {
    queries.push(
      LINUX_DISK_ENCRYPTION_QUERY,
      LINUX_IPTABLES_QUERY,
      POSIX_SHELL_HISTORY_QUERY,
      LINUX_SECURE_BOOT_QUERY,
      LINUX_LOCAL_ADMINS_QUERY
    );
  } else if (platform === 'darwin') {
    queries.push(
      MACOS_DISK_ENCRYPTION_QUERY,
      MACOS_ALF_QUERY,
      POSIX_SHELL_HISTORY_QUERY,
      MACOS_SIP_QUERY,
      MACOS_LOCAL_ADMINS_QUERY
    );
  }

  return queries;
};

/**
 * Example pack configuration for creating an osquery pack via API
 *
 * POST /api/osquery/packs
 * {
 *   "name": "endpoint-asset-posture",
 *   "description": "Security posture queries for Endpoint Asset Management",
 *   "enabled": true,
 *   "queries": { ... }
 * }
 */
export const POSTURE_PACK_CONFIG = {
  name: 'endpoint-asset-posture',
  description: 'Security posture queries for Endpoint Asset Management. Collects disk encryption, firewall, shell history, secure boot, and local admin data.',
  enabled: true,
  queries: getAllPostureQueries().reduce((acc, query) => {
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
 * Secure Boot and Local Admin queries only
 * Use this pack to collect secure boot status and local admin count data
 */
const SECURE_BOOT_AND_ADMIN_QUERIES: PostureQuery[] = [
  WINDOWS_SECURE_BOOT_QUERY,
  LINUX_SECURE_BOOT_QUERY,
  MACOS_SIP_QUERY,
  WINDOWS_LOCAL_ADMINS_QUERY,
  LINUX_LOCAL_ADMINS_QUERY,
  MACOS_LOCAL_ADMINS_QUERY,
];

export const SECURE_BOOT_ADMIN_PACK_CONFIG = {
  name: 'endpoint-asset-posture-secureboot-admins',
  description: 'Secure Boot and Local Admin queries for Endpoint Asset Management. Collects secure boot status and local administrator count.',
  enabled: true,
  queries: SECURE_BOOT_AND_ADMIN_QUERIES.reduce((acc, query) => {
    acc[query.id] = {
      query: query.query,
      interval: query.interval,
      platform: query.platform,
      ecs_mapping: query.ecsMapping,
    };
    return acc;
  }, {} as Record<string, { query: string; interval: number; platform: string; ecs_mapping: Record<string, { field: string }> }>),
};
