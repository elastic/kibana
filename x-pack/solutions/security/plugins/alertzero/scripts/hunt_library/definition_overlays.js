/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reviewed, hand-authored parts of each POC hunt definition (plan 18, Phase 0). The generator
 * merges these with TRADE metadata (name, description, notes, MITRE, references) and the TRADE
 * query text. Query edits against TRADE, applied to every aggregate:
 *   - The hard-coded `@timestamp > now() - 7 day` predicate is dropped. The execution window
 *     (Discover time picker or the worker's range filter) supplies it, so analysts can widen it.
 *   - `max(@timestamp)` is added as `last_seen` (or an existing bucket column is the time field),
 *     so each aggregate row carries the time its occurrence group is bucketed on.
 *   - A nullable group-by field is wrapped in `coalesce(..., "unknown")` so rows are not rejected
 *     for a null key.
 *   - Okta actor exclusions use the ES|QL `LIKE` wildcard `*`. TRADE wrote the SQL wildcard `%`,
 *     which ES|QL treats literally, so its "Okta" and "Datadog" exclusions never matched.
 */

const UUID_NORMALIZE = String.raw`"""([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|ns[a-z][A-Z0-9]{3,4}\.tmp|DX[A-Z0-9]{3,4}\.tmp|7z[A-Z0-9]{3,5}\.tmp|[0-9\.\-\_]{3,})"""`;
const USER_DIR_SYSMON = String.raw`"""[cC]:\\[uU][sS][eE][rR][sS]\\[a-zA-Z0-9ñ\.\-\_\$~ ]+\\""", "C:\\\\users\\\\user\\\\"`;
const USER_DIR_ENDPOINT = String.raw`"""[cC]:\\[uU][sS][eE][rR][sS]\\[a-zA-Z0-9\.\-\_\$~ ]+\\""", "C:\\\\users\\\\user\\\\"`;

const BUCKET = '| where @timestamp >= {{param.bucket_start}} and @timestamp < {{param.bucket_end}}';

const GTFOBINS_PROCESSES = `"ab", "aria2c", "bash", "cpan", "curl", "easy_install", "finger", "ftp",
  "gdb", "gimp", "irb", "jjs", "jrunscript", "julia", "ksh", "lua", "lwp-download",
  "nc", "nmap", "node", "openssl", "php", "pip", "python", "ruby", "rview", "rvim",
  "scp", "sftp", "smbclient", "socat", "ssh", "tar", "tftp", "view", "vim", "vimdiff",
  "wget", "whois", "yum"`;
const NON_ROUTABLE = `"10.0.0.0/8", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.0.0/29", "192.0.0.8/32", "192.0.0.9/32", "192.0.0.10/32", "192.0.0.170/32", "192.0.0.171/32", "192.0.2.0/24", "192.31.196.0/24", "192.52.193.0/24", "192.168.0.0/16", "192.88.99.0/24", "224.0.0.0/4", "100.64.0.0/10", "192.175.48.0/24","198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4", "::1","FE80::/10", "FF00::/8"`;

const SUSPICIOUS_DIRS = `(
  process.executable like "/dev/shm/*" or
  process.executable like "/var/www/*" or
  process.executable like "/boot/*" or
  process.executable like "/srv/*" or
  process.executable rlike "/tmp/[^/]+" or
  process.executable rlike "/var/tmp/[^/]+" or
  process.executable rlike "/run/[^/]+" or
  process.executable rlike "/var/run/[^/]+"
) and not (
  process.parent.executable in ("/usr/sbin/dpkg-preconfigure") or
  process.executable rlike "/tmp/[0-9].*" or
  process.executable rlike "/tmp/.*[0-9]/?" or
  process.executable rlike "/var/tmp/[0-9].*" or
  process.executable rlike "/var/tmp/.*[0-9]/?"
)`;

const RUNDLL32_EXCLUDE = String.raw`""".*(zzzzInvokeManagedCustomActionOutOfProc|GeneralTel.dll,RunInUserCxt|ShOpenVerbApplication|davclnt.dll,DavSetCookie|FileProtocolHandler|EDGEHTML.dll|FirewallControlPanel.dll,ShowNotificationDialog|printui.dll,PrintUIEntryDPIAware|Program Files|SHCreateLocalServerRunDll|ImageView_Fullscreen|StatusMonitorEntryPoint|Control_RunDLL|HotPlugSafeRemovalDriveNotification|AppxDeploymentClient.dll|acproxy.dll,PerformAutochkOperations|CapabilityAccessManagerDoStoreMaintenance|dfshim.dll|display.dll,ShowAdapterSettings|ForceProxyDetectionOnNextRun|PfSvWsSwapAssessmentTask|acmigration.dll,ApplyMigrationShims|LenovoBatteryGaugePackage.dll|-localserver|DriverStore|CnmDxPEntryPoint|DeferredDelete|DeviceProperties_RunDLL|AppxDeploymentClient.dll|spool\\DRIVERS|printui.dll,PrintUIEntry|DfdGetDefaultPolicyAndSMART|cryptext.dll,CryptExt|WininetPlugin.dll|ClearMyTracksByProcess|SusRunTask|OpenURL|CleanupTemporaryState).*"""`;
const RUNDLL32_INDICES =
  'logs-endpoint.events.process-*, logs-windows.sysmon_operational-*, logs-system.security-*';
const RUNDLL32_FILTER = `host.os.family == "windows" and event.category == "process" and event.action in ("start", "Process creation", "created-process") and
  to_lower(process.name) == "rundll32.exe" and
  not process.command_line rlike ${RUNDLL32_EXCLUDE}`;
const RUNDLL32_CMDLINE = `| eval cmdline = replace(process.command_line, ${USER_DIR_ENDPOINT})
| eval cmdline = replace(cmdline, ${UUID_NORMALIZE}, "")`;

const WINDOW = { from: 'now-7d', to: 'now' };

module.exports = [
  {
    tradePath: 'windows/queries/detect_rare_lsass_process_access_attempts.toml',
    queryIndex: 0,
    id: 'rare_lsass_process_access',
    platform: ['windows'],
    hypothesis:
      'A process that opens LSASS memory on a single host, and only a handful of times in the window, may be credential dumping or code injection rather than routine security software.',
    resultKind: 'aggregate',
    requiredIndexPatterns: ['logs-endpoint.events.api*'],
    requiredFields: [
      'event.category',
      'host.os.family',
      'process.Ext.api.name',
      'Target.process.name',
      'process.executable.caseless',
      'host.id',
      '@timestamp',
    ],
    query: `from logs-endpoint.events.api*
| where event.category == "api" and host.os.family == "windows" and process.Ext.api.name in ("OpenProcess", "OpenThread", "ReadProcessMemory") and
 Target.process.name == "lsass.exe"
| keep @timestamp, process.executable.caseless, host.id
 /* normalize process paths to reduce known random patterns in process.executable */
| eval process = replace(process.executable.caseless, ${UUID_NORMALIZE}, "")
| stats occurrences = count(process), agents = count_distinct(host.id), last_seen = max(@timestamp) by process
| where agents == 1 and occurrences <= 10`,
    recommendedColumns: ['process', 'occurrences', 'agents', 'last_seen'],
    evidenceFields: ['process', 'occurrences', 'agents', 'last_seen'],
    adjudicationFields: [
      'process',
      'occurrences',
      'agents',
      'last_seen',
      'host.name',
      'user.name',
      'process.executable',
      'process.Ext.api.name',
      'process.parent.executable',
      'process.command_line',
    ],
    occurrence: { keyFields: ['process'], timeField: 'last_seen', bucket: '1d' },
    surroundingEventQuery: `from logs-endpoint.events.api* METADATA _index, _id
${BUCKET}
| where event.category == "api" and host.os.family == "windows" and process.Ext.api.name in ("OpenProcess", "OpenThread", "ReadProcessMemory") and
 Target.process.name == "lsass.exe"
| eval process = replace(process.executable.caseless, ${UUID_NORMALIZE}, "")
| where process == {{param.process}}
| sort @timestamp desc
| keep _index, _id, @timestamp, host.name, user.name, process.executable, process.Ext.api.name, process.parent.executable, process.command_line`,
    expectedFalsePositives: [
      'Third-party security, backup or monitoring software that legitimately reads LSASS.',
      'LSASS crash handling and Windows Error Reporting.',
    ],
    suggestedPivots: [
      'Pivot on process.executable and host.id to see every access by that binary.',
      'Check the process code signature, parent process and command line.',
      'Look for dumper artifacts (dump files, comsvcs.dll MiniDump, procdump) on the same host.',
    ],
  },
  {
    tradePath: 'windows/queries/createremotethread_by_source_process_with_low_occurrence.toml',
    queryIndex: 0,
    id: 'rare_createremotethread_source_process',
    platform: ['windows'],
    hypothesis:
      'A process that creates a remote thread in another process, seen once on a single host, may be injecting code to run under a trusted process.',
    resultKind: 'aggregate',
    requiredIndexPatterns: ['logs-windows.sysmon_operational-*'],
    requiredFields: [
      'host.os.family',
      'event.category',
      'event.action',
      'process.executable',
      'host.id',
      '@timestamp',
    ],
    query: `from logs-windows.sysmon_operational-*
| where host.os.family == "windows" and event.category == "process" and event.action == "CreateRemoteThread"
| eval source_process = replace(process.executable, ${USER_DIR_SYSMON})
| stats cc = count(*), hosts = count_distinct(host.id), last_seen = max(@timestamp) by source_process
 /* unique source and target processes combined and observed in 1 host */
| where hosts == 1 and cc == 1`,
    recommendedColumns: ['source_process', 'cc', 'hosts', 'last_seen'],
    evidenceFields: ['source_process', 'cc', 'hosts', 'last_seen'],
    adjudicationFields: [
      'source_process',
      'cc',
      'hosts',
      'last_seen',
      'host.name',
      'user.name',
      'process.executable',
      'winlog.event_data.TargetImage',
    ],
    occurrence: { keyFields: ['source_process'], timeField: 'last_seen', bucket: '1d' },
    surroundingEventQuery: `from logs-windows.sysmon_operational-* METADATA _index, _id
${BUCKET}
| where host.os.family == "windows" and event.category == "process" and event.action == "CreateRemoteThread"
| eval source_process = replace(process.executable, ${USER_DIR_SYSMON})
| where source_process == {{param.source_process}}
| sort @timestamp desc
| keep _index, _id, @timestamp, host.name, user.name, process.executable, winlog.event_data.TargetImage`,
    expectedFalsePositives: [
      'Debuggers, accessibility tools and some security or anti-cheat software create remote threads legitimately.',
    ],
    suggestedPivots: [
      'Pivot on the target image to see which process received the thread.',
      'Review the source process signature, parent and prior network activity on the host.',
    ],
  },
  {
    tradePath: 'linux/queries/low_volume_gtfobins_external_network_connections.toml',
    queryIndex: 0,
    id: 'linux_gtfobins_external_connections',
    platform: ['linux'],
    hypothesis:
      'A living-off-the-land binary (curl, nc, python and similar) making only a few external connections to an uncommon port may be staging a download or a reverse shell.',
    resultKind: 'aggregate',
    requiredIndexPatterns: ['logs-endpoint.events.network-*'],
    requiredFields: [
      'host.os.type',
      'event.type',
      'process.name',
      'destination.ip',
      'destination.port',
      '@timestamp',
    ],
    query: `from logs-endpoint.events.network-*
| where host.os.type == "linux" and event.type == "start" and process.name in (
  ${GTFOBINS_PROCESSES}
) and
destination.ip IS NOT null and not CIDR_MATCH(destination.ip, ${NON_ROUTABLE})
| keep @timestamp, process.name, destination.port, destination.ip, user.name, host.name
| stats cc = count(*), last_seen = max(@timestamp) by destination.port, process.name
| where cc <= 5
| sort cc asc, destination.port`,
    recommendedColumns: ['destination.port', 'process.name', 'cc', 'last_seen'],
    evidenceFields: ['destination.port', 'process.name', 'cc', 'last_seen'],
    adjudicationFields: [
      'destination.port',
      'process.name',
      'cc',
      'last_seen',
      'destination.ip',
      'host.name',
      'user.name',
    ],
    occurrence: {
      keyFields: ['process.name', 'destination.port'],
      timeField: 'last_seen',
      bucket: '1d',
    },
    surroundingEventQuery: `from logs-endpoint.events.network-* METADATA _index, _id
${BUCKET}
| where host.os.type == "linux" and event.type == "start" and process.name == {{param.process.name}} and destination.port == {{param.destination.port}} and
destination.ip IS NOT null and not CIDR_MATCH(destination.ip, ${NON_ROUTABLE})
| sort @timestamp desc
| keep _index, _id, @timestamp, host.name, user.name, process.name, destination.ip, destination.port`,
    expectedFalsePositives: [
      'Package managers, CI jobs and configuration management tools reaching external mirrors on unusual ports.',
      'Administrators using ssh, scp or curl against a rarely used external service.',
    ],
    suggestedPivots: [
      'Pivot on destination.ip for other hosts and processes that contacted it.',
      'Check the process command line, parent and user for the same host and time.',
      'Look for new files or cron entries written shortly after the connection.',
    ],
  },
  {
    tradePath:
      'okta/queries/defense_evasion_failed_oauth_access_token_retrieval_via_public_client_app.toml',
    queryIndex: 0,
    id: 'okta_failed_oauth_public_client_scope',
    platform: ['identity'],
    hypothesis:
      'A public client application repeatedly failing to obtain tokens for scopes that are not implicitly granted may be probing for over-privileged OAuth access.',
    resultKind: 'raw_event',
    requiredIndexPatterns: ['logs-okta.system*'],
    requiredFields: [
      'event.dataset',
      'event.action',
      'okta.actor.type',
      'okta.outcome.result',
      'okta.outcome.reason',
      'okta.actor.display_name',
      '@timestamp',
    ],
    query: `from logs-okta.system* METADATA _index, _id
| where
    event.dataset == "okta.system"

    // filter on failed access token grant requests where source is a public client app
    and event.action == "app.oauth2.as.token.grant"
    and okta.actor.type == "PublicClientApp"
    and okta.outcome.result == "FAILURE"

    // filter out known Okta and Datadog actors
    and not (
        okta.actor.display_name LIKE "Okta*"
        or okta.actor.display_name LIKE "Datadog*"
    )

    // filter for scopes that are not implicitly granted
    and okta.outcome.reason == "no_matching_scope"

| keep _index, _id, @timestamp, event.action, okta.actor.type, okta.outcome.result, okta.outcome.reason, okta.actor.display_name`,
    recommendedColumns: [
      '_index',
      '_id',
      '@timestamp',
      'event.action',
      'okta.actor.type',
      'okta.outcome.result',
      'okta.outcome.reason',
      'okta.actor.display_name',
    ],
    evidenceFields: [
      '_index',
      '_id',
      '@timestamp',
      'event.action',
      'okta.actor.type',
      'okta.outcome.result',
      'okta.outcome.reason',
      'okta.actor.display_name',
    ],
    adjudicationFields: [
      '@timestamp',
      'event.action',
      'okta.actor.display_name',
      'okta.outcome.result',
      'okta.outcome.reason',
      'okta.client.ip',
    ],
    occurrence: { keyFields: ['okta.actor.display_name'], timeField: '@timestamp', bucket: '1d' },
    surroundingEventQuery: `from logs-okta.system* METADATA _index, _id
${BUCKET}
| where event.dataset == "okta.system" and okta.actor.display_name == {{param.okta.actor.display_name}}
| sort @timestamp desc
| keep _index, _id, @timestamp, event.action, okta.actor.display_name, okta.outcome.result, okta.outcome.reason, okta.client.ip`,
    expectedFalsePositives: [
      'A newly deployed integration requesting a scope before an administrator grants it.',
    ],
    suggestedPivots: [
      'Pivot on okta.actor.display_name for every event from the application in the same period.',
      'Check whether the application later succeeded with a broader scope.',
    ],
  },
  {
    tradePath: 'aws/queries/iam_assume_role_creation_with_attached_policy.toml',
    queryIndex: 0,
    id: 'aws_iam_cross_account_assume_role_creation',
    platform: ['cloud'],
    hypothesis:
      'An IAM role created with a trust policy that lets another AWS account assume it may be a persistence or privilege-escalation foothold.',
    resultKind: 'raw_event',
    requiredIndexPatterns: ['logs-aws.cloudtrail-*'],
    requiredFields: [
      'event.provider',
      'event.action',
      'aws.cloudtrail.request_parameters',
      'cloud.account.id',
      '@timestamp',
    ],
    query: `from logs-aws.cloudtrail-* METADATA _index, _id
| where
    event.provider == "iam.amazonaws.com"
    and event.action == "CreateRole"
    and aws.cloudtrail.request_parameters RLIKE ".*Allow.*"
    and aws.cloudtrail.request_parameters RLIKE ".*sts:AssumeRole.*"
    and aws.cloudtrail.request_parameters RLIKE ".*assumeRolePolicyDocument.*"
    and aws.cloudtrail.request_parameters RLIKE ".*arn:aws:iam.*"
| dissect aws.cloudtrail.request_parameters "%{}AWS\\": \\"arn:aws:iam::%{target_account_id}:"
| where cloud.account.id != target_account_id
| keep _index, _id, @timestamp, event.action, aws.cloudtrail.request_parameters, target_account_id, cloud.account.id`,
    recommendedColumns: [
      '_index',
      '_id',
      '@timestamp',
      'event.action',
      'aws.cloudtrail.request_parameters',
      'target_account_id',
      'cloud.account.id',
    ],
    evidenceFields: [
      '_index',
      '_id',
      '@timestamp',
      'event.action',
      'aws.cloudtrail.request_parameters',
      'target_account_id',
      'cloud.account.id',
    ],
    adjudicationFields: [
      '@timestamp',
      'event.action',
      'aws.cloudtrail.request_parameters',
      'target_account_id',
      'cloud.account.id',
      'user.name',
      'source.ip',
    ],
    occurrence: { keyFields: ['cloud.account.id'], timeField: '@timestamp', bucket: '1d' },
    surroundingEventQuery: `from logs-aws.cloudtrail-* METADATA _index, _id
${BUCKET}
| where event.provider == "iam.amazonaws.com" and cloud.account.id == {{param.cloud.account.id}}
| sort @timestamp desc
| keep _index, _id, @timestamp, event.action, cloud.account.id, user.name, source.ip, aws.cloudtrail.request_parameters`,
    expectedFalsePositives: [
      'Sanctioned cross-account access between an organisation’s own AWS accounts.',
      'Vendor integrations that create a role for an external account during onboarding.',
    ],
    suggestedPivots: [
      'Check whether the target account belongs to the organisation.',
      'Pivot on the calling identity for other IAM changes, key creation and role assumptions.',
      'Look for AssumeRole calls using the new role from the target account.',
    ],
  },
  {
    tradePath: 'okta/queries/initial_access_password_spraying_from_repeat_source.toml',
    queryIndex: 0,
    id: 'okta_password_spraying_repeat_source',
    platform: ['identity'],
    hypothesis:
      'A single source IP producing invalid-credential failures against many distinct Okta accounts in a day is consistent with password spraying.',
    resultKind: 'aggregate',
    requiredIndexPatterns: ['logs-okta*'],
    requiredFields: [
      'event.action',
      'okta.outcome.result',
      'okta.outcome.reason',
      'okta.actor.alternate_id',
      'okta.client.ip',
      '@timestamp',
    ],
    query: `from logs-okta*

// truncate the timestamp to daily intervals
| eval target_time_window = DATE_TRUNC(1 days, @timestamp)
| where

// filter for invalid credential events
    event.action == "user.session.start"
    and okta.outcome.result == "FAILURE"
    and okta.outcome.reason == "INVALID_CREDENTIALS"
| stats
    // count the distinct number of targeted accounts
    target_count = count_distinct(okta.actor.alternate_id),

    // count the number of invalid credential events for each source IP
    source_count = count(*) by target_time_window, okta.client.ip

// filter for source IPs that targeted at least 10 distinct accounts
| where target_count >= 10`,
    recommendedColumns: ['target_time_window', 'okta.client.ip', 'target_count', 'source_count'],
    evidenceFields: ['target_time_window', 'okta.client.ip', 'target_count', 'source_count'],
    adjudicationFields: [
      'target_time_window',
      'okta.client.ip',
      'target_count',
      'source_count',
      'okta.actor.alternate_id',
      '@timestamp',
    ],
    occurrence: { keyFields: ['okta.client.ip'], timeField: 'target_time_window', bucket: '1d' },
    surroundingEventQuery: `from logs-okta* METADATA _index, _id
${BUCKET}
| where event.action == "user.session.start" and okta.outcome.result == "FAILURE" and okta.outcome.reason == "INVALID_CREDENTIALS" and okta.client.ip == {{param.okta.client.ip}}
| sort @timestamp desc
| keep _index, _id, @timestamp, okta.actor.alternate_id, okta.client.ip, okta.outcome.reason`,
    expectedFalsePositives: [
      'Shared egress addresses (corporate NAT, VPN or proxy) where many users mistype passwords.',
      'Misconfigured clients or password-manager sync retrying stale credentials.',
    ],
    suggestedPivots: [
      'Check whether any targeted account later has a successful sign-in from the same IP.',
      'Pivot on the source IP for other Okta activity and geolocation.',
      'Compare the targeted accounts against high-value users.',
    ],
  },
  {
    tradePath: 'linux/queries/execution_uncommon_process_execution_from_suspicious_directory.toml',
    queryIndex: 0,
    id: 'linux_uncommon_exec_suspicious_directory',
    platform: ['linux'],
    hypothesis:
      'An executable launched from a world-writable or web-served directory, seen on few hosts and only a few times, may be dropped malware or an attacker tool.',
    resultKind: 'aggregate',
    requiredIndexPatterns: ['logs-endpoint.events.process-*'],
    requiredFields: [
      'host.os.type',
      'event.type',
      'event.action',
      'process.executable',
      'process.parent.executable',
      'host.name',
      '@timestamp',
    ],
    query: `from logs-endpoint.events.process-*
| where host.os.type == "linux" and event.type == "start" and event.action == "exec" and ${SUSPICIOUS_DIRS}
| eval parent_executable = coalesce(process.parent.executable, "unknown")
| stats cc = count(), host_count = count_distinct(host.name), last_seen = max(@timestamp) by process.executable, parent_executable
// Alter this threshold to make sense for your environment
| where cc <= 3 and host_count <= 3
| sort cc asc`,
    recommendedColumns: [
      'process.executable',
      'parent_executable',
      'cc',
      'host_count',
      'last_seen',
    ],
    evidenceFields: ['process.executable', 'parent_executable', 'cc', 'host_count', 'last_seen'],
    adjudicationFields: [
      'process.executable',
      'parent_executable',
      'cc',
      'host_count',
      'last_seen',
      'host.name',
      'user.name',
      'process.command_line',
      'process.parent.executable',
    ],
    occurrence: {
      keyFields: ['process.executable', 'parent_executable'],
      timeField: 'last_seen',
      bucket: '1d',
    },
    surroundingEventQuery: `from logs-endpoint.events.process-* METADATA _index, _id
${BUCKET}
| where host.os.type == "linux" and event.type == "start" and event.action == "exec" and ${SUSPICIOUS_DIRS}
| eval parent_executable = coalesce(process.parent.executable, "unknown")
| where process.executable == {{param.process.executable}} and parent_executable == {{param.parent_executable}}
| sort @timestamp desc
| keep _index, _id, @timestamp, host.name, user.name, process.executable, process.parent.executable, process.command_line`,
    expectedFalsePositives: [
      'Build, test and deployment tooling that runs generated binaries from /tmp or /var/www.',
      'Package installation scripts executing from temporary directories.',
    ],
    suggestedPivots: [
      'Pivot on process.executable and host.name for the full process tree.',
      'Check how the file arrived (download, web request, scp) shortly before execution.',
      'Look for persistence (cron, systemd, rc files) created by the same user.',
    ],
  },
  {
    tradePath: 'windows/queries/rundll32_execution_aggregated_by_cmdline.toml',
    queryIndex: 0,
    id: 'rare_rundll32_command_line',
    platform: ['windows'],
    hypothesis:
      'A rundll32.exe command line, after normalising user paths and GUIDs, that appears on only one host and is not a known benign pattern may be proxy execution of a malicious DLL.',
    resultKind: 'aggregate',
    requiredIndexPatterns: [
      'logs-endpoint.events.process-*',
      'logs-windows.sysmon_operational-*',
      'logs-system.security-*',
    ],
    requiredFields: [
      'host.os.family',
      'event.category',
      'event.action',
      'process.name',
      'process.command_line',
      'process.parent.name',
      'host.id',
      '@timestamp',
    ],
    query: `from ${RUNDLL32_INDICES}
| where ${RUNDLL32_FILTER}
| keep @timestamp, process.parent.name, process.command_line, host.id
| eval parent_name = coalesce(process.parent.name, "unknown")
${RUNDLL32_CMDLINE}
| stats hosts = count_distinct(host.id), total = count(), last_seen = max(@timestamp) by cmdline, parent_name
| where hosts == 1`,
    recommendedColumns: ['cmdline', 'parent_name', 'hosts', 'total', 'last_seen'],
    evidenceFields: ['cmdline', 'parent_name', 'hosts', 'total', 'last_seen'],
    adjudicationFields: [
      'cmdline',
      'parent_name',
      'hosts',
      'total',
      'last_seen',
      'host.name',
      'user.name',
      'process.command_line',
      'process.parent.name',
    ],
    occurrence: { keyFields: ['cmdline', 'parent_name'], timeField: 'last_seen', bucket: '1d' },
    surroundingEventQuery: `from ${RUNDLL32_INDICES} METADATA _index, _id
${BUCKET}
| where ${RUNDLL32_FILTER}
| eval parent_name = coalesce(process.parent.name, "unknown")
${RUNDLL32_CMDLINE}
| where cmdline == {{param.cmdline}} and parent_name == {{param.parent_name}}
| sort @timestamp desc
| keep _index, _id, @timestamp, host.name, user.name, process.command_line, process.parent.name`,
    expectedFalsePositives: [
      'Vendor installers and updaters that invoke rundll32.exe with unique arguments.',
      'Per-device printer, driver and shell-extension command lines not covered by the exclusion list.',
    ],
    suggestedPivots: [
      'Pivot on the DLL path in the command line and check its signature and creation time.',
      'Review the parent process and what the host did next (network, child processes).',
    ],
  },
];

module.exports.DEFAULT_TIME_RANGE = WINDOW;
