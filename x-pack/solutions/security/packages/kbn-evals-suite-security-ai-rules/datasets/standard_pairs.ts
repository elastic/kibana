/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferenceRule } from './sample_rules';

/**
 * Standard prompt/rule pairs sourced from elastic/detection-rules.
 * Each entry maps a natural-language prompt to the expected reference rule.
 *
 * Sources:
 *   https://github.com/elastic/detection-rules/blob/main/rules/
 */
export const standardPairs: ReferenceRule[] = [
  // Pair 1 — https://github.com/elastic/detection-rules/blob/main/rules/windows/privilege_escalation_uac_bypass_winfw_mmc_hijack.toml
  {
    id: 'uac-bypass-winfw-mmc-hijack',
    name: 'UAC Bypass via Windows Firewall Snap-In Hijack',
    prompt:
      'Identifies attempts to bypass User Account Control (UAC) by hijacking the Microsoft Management Console (MMC) Windows Firewall snap-in. Attackers bypass UAC to stealthily execute code with elevated permissions.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Identifies attempts to bypass User Account Control (UAC) by hijacking the Microsoft Management Console (MMC) Windows Firewall snap-in. Attackers bypass UAC to stealthily execute code with elevated permissions.',
    query: `process where host.os.type == "windows" and event.type == "start" and
 process.parent.name == "mmc.exe" and
 /* args of the Windows Firewall SnapIn */
  process.parent.args == "WF.msc" and process.name != "WerFault.exe"`,
    threat: [
      { technique: 'T1548', tactic: 'TA0004', subtechnique: 'Bypass User Account Control' },
      { technique: 'T1548', tactic: 'TA0005', subtechnique: 'Bypass User Account Control' },
      { technique: 'T1218', tactic: 'TA0005', subtechnique: 'MMC' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'OS: Windows',
      'Use Case: Threat Detection',
      'Tactic: Privilege Escalation',
      'Tactic: Defense Evasion',
      'Resources: Investigation Guide',
      'Data Source: Elastic Endgame',
      'Data Source: Elastic Defend',
      'Data Source: Sysmon',
      'Data Source: Microsoft Defender for Endpoint',
      'Data Source: SentinelOne',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'privilege_escalation',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type == "windows" AND event.type == "start"
    AND process.parent.name == "mmc.exe"
    AND process.parent.args == "WF.msc"
    AND process.name != "WerFault.exe"`,
  },

  // Pair 2 — https://github.com/elastic/detection-rules/blob/main/rules/windows/defense_evasion_posh_obfuscation_high_number_proportion.toml
  {
    id: 'posh-obfuscation-high-number-proportion',
    name: 'Potential PowerShell Obfuscation via High Numeric Character Proportion',
    prompt:
      'Detects long PowerShell script block content with unusually high numeric character density (high digit-to-length ratio), often produced by byte arrays, character-code reconstruction, or embedded encoded blobs. Attackers use numeric-heavy obfuscation to conceal payloads and rebuild them at runtime to avoid static inspection.\n\nAvailable data: logs-windows.powershell_operational*',
    description:
      'Detects long PowerShell script block content with unusually high numeric character density (high digit-to-length ratio), often produced by byte arrays, character-code reconstruction, or embedded encoded blobs. Attackers use numeric-heavy obfuscation to conceal payloads and rebuild them at runtime to avoid static inspection.',
    query: `from logs-windows.powershell_operational* metadata _id, _version, _index
| where event.code == "4104"
| eval Esql.script_block_length = length(powershell.file.script_block_text)
| where Esql.script_block_length > 1000
| eval Esql.script_block_tmp = replace(powershell.file.script_block_text, """[0-9]""", "🔥")
| eval Esql.script_block_pattern_count = Esql.script_block_length - length(replace(Esql.script_block_tmp, "🔥", ""))
| eval Esql.script_block_ratio = Esql.script_block_pattern_count::double / Esql.script_block_length::double
| where Esql.script_block_ratio > 0.5`,
    threat: [
      { technique: 'T1027', tactic: 'TA0005' },
      { technique: 'T1140', tactic: 'TA0005' },
      { technique: 'T1059', tactic: 'TA0002', subtechnique: 'PowerShell' },
    ],
    severity: 'low',
    tags: [
      'Domain: Endpoint',
      'OS: Windows',
      'Use Case: Threat Detection',
      'Tactic: Defense Evasion',
      'Data Source: PowerShell Logs',
      'Resources: Investigation Guide',
    ],
    riskScore: 21,
    from: 'now-9m',
    category: 'defense_evasion',
    type: 'esql',
    language: 'esql',
  },

  // Pair 3 — https://github.com/elastic/detection-rules/blob/main/rules/windows/credential_access_web_config_file_access.toml
  {
    id: 'credential-access-web-config-file',
    name: 'Unusual Web Config File Access',
    prompt:
      'Detects unusual access to the web.config file, which contains sensitive credential information such as database connection strings, machineKey validation/decryption keys, and SAML/OAuth token settings. Attackers can use the information extracted to forge malicious __VIEWSTATE requests for persistent RCE on the web server or pivot to the SQL server using exposed connection strings.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Detects unusual access to the web.config file, which contains sensitive credential information such as database connection strings, machineKey validation/decryption keys, and SAML/OAuth token settings. Attackers can use the information extracted to forge malicious __VIEWSTATE requests for persistent RCE on the web server or pivot to the SQL server using exposed connection strings.',
    query: `event.category:file and host.os.type:windows and event.action:open and
 file.name:"web.config" and file.path : *VirtualDirectories* and
 not process.executable: (
 "C:\\Program Files\\Microsoft Security Client\\MsMpEng.exe" or
 "C:\\Program Files\\Windows Defender Advanced Threat Protection\\MsSense.exe" or
 "C:\\Windows\\System32\\MRT.exe"
 )`,
    threat: [{ technique: 'T1003', tactic: 'TA0006' }],
    severity: 'high',
    tags: [
      'Domain: Endpoint',
      'OS: Windows',
      'Use Case: Threat Detection',
      'Tactic: Credential Access',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
    ],
    riskScore: 73,
    from: 'now-9m',
    category: 'credential_access',
    type: 'new_terms',
    language: 'kuery',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE event.category == "file"
    AND host.os.type == "windows"
    AND event.action == "open"
    AND file.name == "web.config"
    AND file.path like "*VirtualDirectories*"
    AND NOT process.executable IN (
      "C:\\\\Program Files\\\\Microsoft Security Client\\\\MsMpEng.exe",
      "C:\\\\Program Files\\\\Windows Defender Advanced Threat Protection\\\\MsSense.exe",
      "C:\\\\Windows\\\\System32\\\\MRT.exe"
    )`,
  },

  // Pair 4 — https://github.com/elastic/detection-rules/blob/main/rules/linux/initial_access_telnet_auth_bypass_via_user_envar.toml
  {
    id: 'telnet-auth-bypass-cve-2026-24061',
    name: 'Potential Telnet Authentication Bypass (CVE-2026-24061)',
    prompt:
      'Identifies potential exploitation of a Telnet remote authentication bypass vulnerability (CVE-2026-24061) in GNU Inetutils telnetd. The vulnerability allows unauthenticated access by supplying a crafted `-f <username>` value via the `USER` environment variable, resulting in a login process spawned with elevated privileges.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Identifies potential exploitation of a Telnet remote authentication bypass vulnerability (CVE-2026-24061) in GNU Inetutils telnetd. The vulnerability allows unauthenticated access by supplying a crafted `-f <username>` value via the `USER` environment variable, resulting in a login process spawned with elevated privileges.',
    query: `process where host.os.type == "linux" and event.type == "start" and
 event.action in ("exec", "exec_event", "start", "ProcessRollup2", "executed") and
 process.name == "login" and process.parent.name == "telnetd" and process.args : "-*f*"`,
    threat: [
      { technique: 'T1190', tactic: 'TA0001' },
      { technique: 'T1210', tactic: 'TA0008' },
    ],
    severity: 'critical',
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Initial Access',
      'Tactic: Lateral Movement',
      'Resources: Investigation Guide',
      'Use Case: Vulnerability',
      'Data Source: Elastic Defend',
      'Data Source: Elastic Endgame',
      'Data Source: Crowdstrike',
      'Data Source: SentinelOne',
    ],
    riskScore: 99,
    from: 'now-9m',
    category: 'initial_access',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type == "linux" AND event.type == "start"
    AND event.action IN ("exec", "exec_event", "start", "ProcessRollup2", "executed")
    AND process.name == "login" AND process.parent.name == "telnetd"
    AND process.args like "-*f*"`,
  },

  // Pair 5 — https://github.com/elastic/detection-rules/blob/main/rules/linux/privilege_escalation_potential_bufferoverflow_attack.toml
  {
    id: 'potential-buffer-overflow-attack',
    name: 'Potential Buffer Overflow Attack Detected',
    prompt:
      'Detects potential buffer overflow attacks by querying the "Segfault Detected" pre-built rule signal index, through a threshold rule, with a minimum number of 100 segfault alerts in a short timespan. A large amount of segfaults in a short time interval could indicate application exploitation attempts.\n\nAvailable data: .alerts-security.*',
    description:
      'Detects potential buffer overflow attacks by querying the "Segfault Detected" pre-built rule signal index, through a threshold rule, with a minimum number of 100 segfault alerts in a short timespan. A large amount of segfaults in a short time interval could indicate application exploitation attempts.',
    query: `kibana.alert.rule.rule_id:"5c81fc9d-1eae-437f-ba07-268472967013" and host.os.type:linux and event.kind:signal`,
    threat: [
      { technique: 'T1068', tactic: 'TA0004' },
      { technique: 'T1190', tactic: 'TA0001' },
    ],
    severity: 'low',
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Privilege Escalation',
      'Tactic: Initial Access',
      'Use Case: Vulnerability',
      'Rule Type: Higher-Order Rule',
      'Resources: Investigation Guide',
    ],
    riskScore: 21,
    from: 'now-9m',
    category: 'privilege_escalation',
    type: 'threshold',
    language: 'kuery',
    esqlQuery: `FROM .alerts-security.* metadata _id, _version, _index
| WHERE kibana.alert.rule.rule_id == "5c81fc9d-1eae-437f-ba07-268472967013"
    AND host.os.type == "linux"
    AND event.kind == "signal"`,
  },

  // Pair 6 — https://github.com/elastic/detection-rules/blob/main/rules/macos/persistence_loginwindow_plist_modification.toml
  {
    id: 'macos-loginwindow-plist-modification',
    name: 'Potential Persistence via Login Hook',
    prompt:
      'Identifies the creation or modification of the login window property list (plist). Adversaries may modify plist files to run a program during system boot or user login for persistence.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Identifies the creation or modification of the login window property list (plist). Adversaries may modify plist files to run a program during system boot or user login for persistence.',
    query: `event.category:file and host.os.type:macos and not event.type:"deletion" and
 file.name:"com.apple.loginwindow.plist" and
 not process.name: (systemmigrationd or DesktopServicesHelper or diskmanagementd or rsync or launchd or cfprefsd or xpcproxy or ManagedClient or MCXCompositor or backupd or "iMazing Profile Editor" or storagekitd or CloneKitService)`,
    threat: [
      { technique: 'T1547', tactic: 'TA0003' },
      { technique: 'T1647', tactic: 'TA0005' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'OS: macOS',
      'Use Case: Threat Detection',
      'Tactic: Persistence',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'persistence',
    type: 'query',
    language: 'kuery',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE event.category == "file"
    AND host.os.type == "macos"
    AND event.type != "deletion"
    AND file.name == "com.apple.loginwindow.plist"
    AND NOT process.name IN ("systemmigrationd", "DesktopServicesHelper", "diskmanagementd", "rsync", "launchd", "cfprefsd", "xpcproxy", "ManagedClient", "MCXCompositor", "backupd", "iMazing Profile Editor", "storagekitd", "CloneKitService")`,
  },

  // Pair 7 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/ml_cloudtrail_rare_method_by_user.toml
  {
    id: 'aws-unusual-command-for-user-ml',
    name: 'Unusual AWS Command for a User',
    prompt:
      'A machine learning job detected an AWS API command that, while not inherently suspicious or abnormal, is being made by a user context that does not normally use the command. This can be the result of compromised credentials or keys as someone uses a valid account to persist, move laterally, or exfiltrate data.\n\nAvailable data: logs-*',
    description:
      'A machine learning job detected an AWS API command that, while not inherently suspicious or abnormal, is being made by a user context that does not normally use the command. This can be the result of compromised credentials or keys as someone uses a valid account to persist, move laterally, or exfiltrate data.',
    query: '',
    threat: [
      { technique: 'T1078', tactic: 'TA0001', subtechnique: 'Cloud Accounts' },
      { technique: 'T1021', tactic: 'TA0008', subtechnique: 'Cloud Services' },
      { technique: 'T1041', tactic: 'TA0010' },
    ],
    severity: 'low',
    tags: [
      'Domain: Cloud',
      'Data Source: AWS',
      'Data Source: Amazon Web Services',
      'Rule Type: ML',
      'Rule Type: Machine Learning',
      'Resources: Investigation Guide',
    ],
    riskScore: 21,
    from: 'now-2h',
    category: 'initial_access',
    type: 'machine_learning',
    interval: '15m',
  },

  // Pair 8 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/defense_evasion_route53_dns_query_resolver_config_deletion.toml
  {
    id: 'aws-route53-resolver-query-log-deletion',
    name: 'AWS Route 53 Resolver Query Log Configuration Deleted',
    prompt:
      'Identifies the deletion of an Amazon Route 53 Resolver Query Log Configuration. Resolver query logs provide critical visibility into DNS activity across VPCs, including lookups made by EC2 instances, containers, Lambda functions, and other AWS resources. Deleting a query log configuration immediately stops DNS query and response logging for the associated VPC. Adversaries may delete these configurations to evade detection, suppress forensic evidence, or degrade security monitoring capabilities.\n\nAvailable data: logs-aws.cloudtrail*',
    description:
      'Identifies the deletion of an Amazon Route 53 Resolver Query Log Configuration. Resolver query logs provide critical visibility into DNS activity across VPCs, including lookups made by EC2 instances, containers, Lambda functions, and other AWS resources. Deleting a query log configuration immediately stops DNS query and response logging for the associated VPC. Adversaries may delete these configurations to evade detection, suppress forensic evidence, or degrade security monitoring capabilities.',
    query: `event.dataset: aws.cloudtrail 
 and event.provider: route53resolver.amazonaws.com
 and event.action: DeleteResolverQueryLogConfig 
 and event.outcome: success`,
    threat: [
      { technique: 'T1562', tactic: 'TA0005', subtechnique: 'Disable or Modify Cloud Logs' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Cloud',
      'Data Source: AWS',
      'Data Source: Amazon Web Services',
      'Data Source: AWS Route 53',
      'Use Case: Log Auditing',
      'Resources: Investigation Guide',
      'Tactic: Defense Evasion',
    ],
    riskScore: 47,
    from: 'now-6m',
    category: 'defense_evasion',
    type: 'query',
    language: 'kuery',
    esqlQuery: `FROM logs-aws.cloudtrail* metadata _id, _version, _index
| WHERE event.dataset == "aws.cloudtrail"
    AND event.provider == "route53resolver.amazonaws.com"
    AND event.action == "DeleteResolverQueryLogConfig"
    AND event.outcome == "success"`,
  },

  // Pair 9 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/azure/persistence_entra_id_service_principal_created.toml
  {
    id: 'entra-id-service-principal-created',
    name: 'Entra ID Service Principal Created',
    prompt:
      "Identifies when a new service principal is added in Microsoft Entra ID. An application, hosted service, or automated tool that accesses or modifies resources needs an identity created. This identity is known as a service principal. For security reasons, it's always recommended to use service principals with automated tools rather than allowing them to log in with a user identity.\n\nAvailable data: logs-azure.auditlogs*",
    description:
      'Identifies when a new service principal is added in Microsoft Entra ID. An application, hosted service, or automated tool that accesses or modifies resources needs an identity created. This identity is known as a service principal.',
    query: `event.dataset:azure.auditlogs
 and azure.auditlogs.operation_name:"Add service principal"
 and event.outcome:(success or Success)
 and not azure.auditlogs.identity: (
 "Managed Service Identity" or
 "Windows Azure Service Management API" or
 "Microsoft Azure AD Internal - Jit Provisioning" or
 "AAD App Management" or
 "Power Virtual Agents Service"
 )`,
    threat: [{ technique: 'T1136', tactic: 'TA0003', subtechnique: 'Cloud Account' }],
    severity: 'low',
    tags: [
      'Domain: Cloud',
      'Data Source: Azure',
      'Data Source: Microsoft Entra ID',
      'Data Source: Microsoft Entra ID Audit Logs',
      'Use Case: Identity and Access Audit',
      'Resources: Investigation Guide',
      'Tactic: Persistence',
    ],
    riskScore: 21,
    from: 'now-9m',
    category: 'persistence',
    type: 'query',
    language: 'kuery',
    esqlQuery: `FROM logs-azure.auditlogs* metadata _id, _version, _index
| WHERE event.dataset == "azure.auditlogs"
    AND azure.auditlogs.operation_name == "Add service principal"
    AND event.outcome IN ("success", "Success")
    AND NOT azure.auditlogs.identity IN (
      "Managed Service Identity",
      "Windows Azure Service Management API",
      "Microsoft Azure AD Internal - Jit Provisioning",
      "AAD App Management",
      "Power Virtual Agents Service"
    )`,
  },

  // Pair 10 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/gcp/defense_evasion_gcp_logging_sink_deletion.toml
  {
    id: 'gcp-logging-sink-deletion',
    name: 'GCP Logging Sink Deletion',
    prompt:
      "Identifies a Logging sink deletion in Google Cloud Platform (GCP). Every time a log entry arrives, Logging compares the log entry to the sinks in that resource. Each sink whose filter matches the log entry writes a copy of the log entry to the sink's export destination. An adversary may delete a Logging sink to evade detection.\n\nAvailable data: logs-gcp.audit*",
    description:
      "Identifies a Logging sink deletion in Google Cloud Platform (GCP). Every time a log entry arrives, Logging compares the log entry to the sinks in that resource. Each sink whose filter matches the log entry writes a copy of the log entry to the sink's export destination. An adversary may delete a Logging sink to evade detection.",
    query: `event.dataset:gcp.audit and event.action:google.logging.v*.ConfigServiceV*.DeleteSink and event.outcome:success`,
    threat: [{ technique: 'T1562', tactic: 'TA0005' }],
    severity: 'medium',
    tags: [
      'Domain: Cloud',
      'Data Source: GCP',
      'Data Source: Google Cloud Platform',
      'Use Case: Log Auditing',
      'Tactic: Defense Evasion',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'defense_evasion',
    type: 'query',
    language: 'kuery',
    esqlQuery: `FROM logs-gcp.audit* metadata _id, _version, _index
| WHERE event.dataset == "gcp.audit"
    AND event.action like "google.logging.v*.ConfigServiceV*.DeleteSink"
    AND event.outcome == "success"`,
  },

  // Pair 11 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/o365/impact_security_compliance_potential_ransomware_activity.toml
  {
    id: 'm365-security-compliance-potential-ransomware',
    name: 'M365 Security Compliance Potential Ransomware Activity',
    prompt:
      'Identifies when Microsoft Cloud App Security flags potential ransomware activity in Microsoft 365. This rule detects events where the Security Compliance Center reports a "Ransomware activity" or "Potential ransomware activity" alert, which may indicate file encryption, mass file modifications, or uploads of ransomware-infected files to cloud services such as SharePoint or OneDrive.\n\nAvailable data: logs-o365.audit*',
    description:
      'Identifies when Microsoft Cloud App Security flags potential ransomware activity in Microsoft 365. This rule detects events where the Security Compliance Center reports a "Ransomware activity" or "Potential ransomware activity" alert, which may indicate file encryption, mass file modifications, or uploads of ransomware-infected files to cloud services such as SharePoint or OneDrive.',
    query: `event.dataset:o365.audit and
 event.provider:SecurityComplianceCenter and
 event.category:web and
 rule.name:("Ransomware activity" or "Potential ransomware activity") and
 event.outcome:success`,
    threat: [{ technique: 'T1486', tactic: 'TA0040' }],
    severity: 'medium',
    tags: [
      'Domain: Cloud',
      'Domain: SaaS',
      'Data Source: Microsoft 365',
      'Data Source: Microsoft 365 Audit Logs',
      'Use Case: Threat Detection',
      'Tactic: Impact',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'impact',
    type: 'query',
    language: 'kuery',
    esqlQuery: `FROM logs-o365.audit* metadata _id, _version, _index
| WHERE event.dataset == "o365.audit"
    AND event.provider == "SecurityComplianceCenter"
    AND event.category == "web"
    AND rule.name IN ("Ransomware activity", "Potential ransomware activity")
    AND event.outcome == "success"`,
  },

  // Pair 12 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/o365/credential_access_entra_id_device_reg_via_oauth_redirection.toml
  {
    id: 'entra-id-device-reg-via-oauth-redirection',
    name: 'M365 Identity OAuth Flow by User Sign-in to Device Registration',
    prompt:
      'Identifies attempts to register a new device in Microsoft Entra ID after OAuth authentication with authorization code grant. Adversaries may use OAuth phishing techniques to obtain an OAuth authorization code, which can then be exchanged for access and refresh tokens. This rule detects a sequence of events where a user principal authenticates via OAuth, followed by a device registration event, indicating potential misuse of the OAuth flow to establish persistence or access resources.\n\nAvailable data: logs-o365.audit*',
    description:
      'Identifies attempts to register a new device in Microsoft Entra ID after OAuth authentication with authorization code grant. Adversaries may use OAuth phishing techniques to obtain an OAuth authorization code, which can then be exchanged for access and refresh tokens.',
    query: `sequence by related.user with maxspan=30m
[authentication where event.action == "UserLoggedIn" and
 o365.audit.ExtendedProperties.RequestType == "OAuth2:Authorize" and o365.audit.ExtendedProperties.ResultStatusDetail == "Redirect" and
 o365.audit.UserType: ("0", "2", "3", "10")]
[authentication where event.action == "UserLoggedIn" and
 o365.audit.ExtendedProperties.RequestType == "OAuth2:Token" and o365.audit.ExtendedProperties.ResultStatusDetail == "Success"]
[web where event.dataset == "o365.audit" and event.action == "Add registered users to device."]`,
    threat: [
      { technique: 'T1528', tactic: 'TA0006' },
      { technique: 'T1098', tactic: 'TA0003', subtechnique: 'Device Registration' },
      { technique: 'T1566', tactic: 'TA0001', subtechnique: 'Spearphishing Link' },
    ],
    severity: 'high',
    tags: [
      'Domain: Cloud',
      'Domain: SaaS',
      'Data Source: Microsoft 365',
      'Data Source: Microsoft 365 Audit Logs',
      'Use Case: Identity and Access Audit',
      'Tactic: Credential Access',
      'Resources: Investigation Guide',
    ],
    riskScore: 73,
    from: 'now-30m',
    category: 'credential_access',
    type: 'eql',
    language: 'eql',
    interval: '15m',
    esqlQuery: `FROM logs-o365.audit* metadata _id, _version, _index
| WHERE (
    (event.action == "UserLoggedIn"
      AND o365.audit.ExtendedProperties.RequestType == "OAuth2:Authorize"
      AND o365.audit.ExtendedProperties.ResultStatusDetail == "Redirect"
      AND o365.audit.UserType IN ("0", "2", "3", "10"))
    OR
    (event.action == "UserLoggedIn"
      AND o365.audit.ExtendedProperties.RequestType == "OAuth2:Token"
      AND o365.audit.ExtendedProperties.ResultStatusDetail == "Success")
    OR
    (event.dataset == "o365.audit" AND event.action == "Add registered users to device.")
  )
| EVAL Esql.step = CASE(
    o365.audit.ExtendedProperties.RequestType == "OAuth2:Authorize", "oauth_authorize",
    o365.audit.ExtendedProperties.RequestType == "OAuth2:Token", "oauth_token",
    event.action == "Add registered users to device.", "device_registration",
    "unknown"
  )
| STATS Esql.step_count = COUNT_DISTINCT(Esql.step) BY related.user
| WHERE Esql.step_count >= 3`,
  },

  // Pair 13 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/google_workspace/collection_google_workspace_custom_gmail_route_created_or_modified.toml
  {
    id: 'google-workspace-custom-gmail-route',
    name: 'Google Workspace Custom Gmail Route Created or Modified',
    prompt:
      "Detects when a custom Gmail route is added or modified in Google Workspace. Adversaries can add a custom e-mail route for outbound mail to route these e-mails to their own inbox of choice for data gathering. This allows adversaries to capture sensitive information from e-mail and potential attachments, such as invoices or payment documents. By default, all email from current Google Workspace users with accounts are routed through a domain's mail server for inbound and outbound mail.\n\nAvailable data: logs-google_workspace.admin*",
    description:
      'Detects when a custom Gmail route is added or modified in Google Workspace. Adversaries can add a custom e-mail route for outbound mail to route these e-mails to their own inbox of choice for data gathering.',
    query: `event.dataset:"google_workspace.admin" and event.action:("CREATE_GMAIL_SETTING" or "CHANGE_GMAIL_SETTING")
 and google_workspace.event.type:"EMAIL_SETTINGS" and google_workspace.admin.setting.name:("EMAIL_ROUTE" or "MESSAGE_SECURITY_RULE")`,
    threat: [{ technique: 'T1114', tactic: 'TA0009', subtechnique: 'Email Forwarding Rule' }],
    severity: 'medium',
    tags: [
      'Domain: Cloud',
      'Data Source: Google Workspace',
      'Tactic: Collection',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-130m',
    category: 'collection',
    type: 'query',
    language: 'kuery',
    interval: '10m',
    esqlQuery: `FROM logs-google_workspace.admin* metadata _id, _version, _index
| WHERE event.dataset == "google_workspace.admin"
    AND event.action IN ("CREATE_GMAIL_SETTING", "CHANGE_GMAIL_SETTING")
    AND google_workspace.event.type == "EMAIL_SETTINGS"
    AND google_workspace.admin.setting.name IN ("EMAIL_ROUTE", "MESSAGE_SECURITY_RULE")`,
  },

  // Pair 14 — https://github.com/elastic/detection-rules/blob/main/rules/linux/privilege_escalation_mount_launched_inside_container.toml
  {
    id: 'mount-launched-inside-container',
    name: 'Mount Launched Inside a Container',
    prompt:
      'This rule detects the use of the mount utility from inside a container. The mount command is used to make a device or file system accessible to the system, and then to connect its root directory to a specified mount point on the local file system. When launched inside a privileged container--a container deployed with all the capabilities of the host machine-- an attacker can access sensitive host level files which could be used for further privilege escalation and container escapes to the host machine. Any usage of mount inside a running privileged container should be further investigated.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Detects the use of the mount utility from inside a container. When launched inside a privileged container, an attacker can access sensitive host level files which could be used for further privilege escalation and container escapes to the host machine.',
    query: `process where host.os.type == "linux" and event.type == "start" and event.action == "exec" and
process.entry_leader.entry_meta.type == "container" and process.name == "mount" and not (
 process.parent.command_line like "*grep*" or
 process.parent.executable like (
 "/usr/local/bin/dind", "/run/k3s/containerd/io.containerd.runtime.v2.task/k8s.io/*/longhorn-instance-manager",
 "/run/k3s/containerd/io.containerd.runtime.v2.task/k8s.io/*/longhorn-manager", "/usr/sbin/update-binfmts",
 "/usr/local/bin/engine-manager", "/usr/bin/timeout", "/opt/gitlab/embedded/bin/ruby", "/usr/local/sbin/longhorn-manager",
 "/longhorn-share-manager", "/usr/lib/systemd/systemd", "/lib/systemd/systemd"
 ) or
 process.parent.args in ("/usr/local/bin/instance-manager", "/usr/local/sbin/nsmounter")
)`,
    threat: [{ technique: 'T1611', tactic: 'TA0004' }],
    severity: 'medium',
    tags: [
      'Domain: Container',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Privilege Escalation',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'privilege_escalation',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type == "linux" AND event.type == "start" AND event.action == "exec"
    AND process.entry_leader.entry_meta.type == "container" AND process.name == "mount"
    AND NOT (
      process.parent.command_line like "*grep*" OR
      process.parent.executable like (
        "/usr/local/bin/dind",
        "/run/k3s/containerd/io.containerd.runtime.v2.task/k8s.io/*/longhorn-instance-manager",
        "/run/k3s/containerd/io.containerd.runtime.v2.task/k8s.io/*/longhorn-manager",
        "/usr/sbin/update-binfmts",
        "/usr/local/bin/engine-manager", "/usr/bin/timeout", "/opt/gitlab/embedded/bin/ruby",
        "/usr/local/sbin/longhorn-manager", "/longhorn-share-manager",
        "/usr/lib/systemd/systemd", "/lib/systemd/systemd"
      ) OR
      process.parent.args IN ("/usr/local/bin/instance-manager", "/usr/local/sbin/nsmounter")
    )`,
  },

  // Pair 15 — https://github.com/elastic/detection-rules/blob/main/rules/network/command_and_control_vnc_virtual_network_computing_to_the_internet.toml
  {
    id: 'vnc-to-the-internet',
    name: 'VNC (Virtual Network Computing) to the Internet',
    prompt:
      'This rule detects network events that may indicate the use of VNC traffic to the Internet. VNC is commonly used by system administrators to remotely control a system for maintenance or to use shared resources. It should almost never be directly exposed to the Internet, as it is frequently targeted and exploited by threat actors as an initial access or backdoor vector.\n\nAvailable data: logs-network_traffic.flow*',
    description:
      'Detects network events that may indicate the use of VNC traffic to the Internet. VNC should almost never be directly exposed to the Internet, as it is frequently targeted and exploited by threat actors as an initial access or backdoor vector.',
    query: `(event.dataset: network_traffic.flow or (event.category: (network or network_traffic))) and
 network.transport:tcp and destination.port >= 5800 and destination.port <= 5810 and
 source.ip:(
 10.0.0.0/8 or
 172.16.0.0/12 or
 192.168.0.0/16
 ) and
 not destination.ip:(
 10.0.0.0/8 or
 127.0.0.0/8 or
 169.254.0.0/16 or
 172.16.0.0/12 or
 192.168.0.0/16 or
 224.0.0.0/4 or
 240.0.0.0/4
 )`,
    threat: [{ technique: 'T1219', tactic: 'TA0011' }],
    severity: 'medium',
    tags: [
      'Tactic: Command and Control',
      'Domain: Endpoint',
      'Use Case: Threat Detection',
      'Data Source: PAN-OS',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'command_and_control',
    type: 'query',
    language: 'kuery',
    esqlQuery: `FROM logs-network_traffic.flow* metadata _id, _version, _index
| WHERE (event.dataset == "network_traffic.flow" OR event.category IN ("network", "network_traffic"))
    AND network.transport == "tcp"
    AND destination.port >= 5800 AND destination.port <= 5810
    AND CIDR_MATCH(source.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
    AND NOT CIDR_MATCH(destination.ip, "10.0.0.0/8", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4", "240.0.0.0/4")`,
  },

  // Pair 16 — https://github.com/elastic/detection-rules/blob/main/rules/cross-platform/multiple_alerts_elastic_defend_netsecurity_by_host.toml
  {
    id: 'elastic-defend-netsecurity-alerts-correlation',
    name: 'Elastic Defend and Network Security Alerts Correlation',
    prompt:
      'This rule correlate any Elastic Defend alert with a set of suspicious events from Network security devices like Palo Alto Networks (PANW) and Fortinet Fortigate by host.ip and source.ip. This may indicate that this host is compromised and triggering multi-datasource alerts.\n\nAvailable data: logs-*',
    description:
      'Correlates any Elastic Defend alert with a set of suspicious events from Network security devices like Palo Alto Networks (PANW) and Fortinet Fortigate by host.ip and source.ip. This may indicate that this host is compromised and triggering multi-datasource alerts.',
    query: `FROM logs-* metadata _id
| WHERE
 (event.module == "endpoint" and event.dataset == "endpoint.alerts") or
 (event.dataset == "panw.panos" and
 event.action in ("virus_detected", "wildfire_virus_detected", "c2_communication", "spyware_detected", "large_upload", "denied", "exploit_detected")) or
 (event.dataset == "fortinet_fortigate.log" and
 (event.action in ("outbreak-prevention", "infected", "blocked") or message like "backdoor*" or message like "Proxy*" or message like "anomaly*"))
|eval fw_alert_source_ip = CASE(event.dataset in ("panw.panos", "fortinet_fortigate.log"), source.ip, null),
 elastic_defend_alert_host_ip = CASE(event.module == "endpoint" and event.dataset == "endpoint.alerts", host.ip, null)
| eval Esql.source_ip = COALESCE(fw_alert_source_ip, elastic_defend_alert_host_ip)
| where Esql.source_ip is not null
| stats Esql.alerts_count = COUNT(*),
 Esql.event_module_distinct_count = COUNT_DISTINCT(event.module)
 by Esql.source_ip
| where Esql.event_module_distinct_count >= 2`,
    threat: [],
    severity: 'high',
    tags: [
      'Use Case: Threat Detection',
      'Rule Type: Higher-Order Rule',
      'Resources: Investigation Guide',
      'Data Source: Elastic Defend',
      'Data Source: Fortinet',
      'Data Source: PAN-OS',
    ],
    riskScore: 73,
    from: 'now-60m',
    category: 'execution',
    type: 'esql',
    language: 'esql',
    interval: '10m',
  },

  // Pair 17 — https://github.com/elastic/detection-rules/blob/main/rules/threat_intel/threat_intel_indicator_match_address.toml
  {
    id: 'threat-intel-ip-address-indicator-match',
    name: 'Threat Intel IP Address Indicator Match',
    prompt:
      'This rule is triggered when an IP address indicator from the Threat Intel Filebeat module or integrations has a match against a network event.\n\nAvailable data: logs-*',
    description:
      'This rule is triggered when an IP address indicator from the Threat Intel Filebeat module or integrations has a match against a network event.',
    query: `source.ip:* or destination.ip:*`,
    threat: [],
    severity: 'high',
    tags: [
      'OS: Windows',
      'Data Source: Elastic Endgame',
      'Rule Type: Threat Match',
      'Resources: Investigation Guide',
    ],
    riskScore: 73,
    from: 'now-65m',
    category: 'threat_intel',
    type: 'threat_match',
    language: 'kuery',
    interval: '1h',
    esqlQuery: `FROM logs-* metadata _id, _version, _index
| WHERE source.ip IS NOT NULL OR destination.ip IS NOT NULL`,
  },

  // Pair 18 — https://github.com/elastic/detection-rules/blob/main/rules/integrations/okta/lateral_movement_multiple_sessions_for_single_user.toml
  {
    id: 'okta-multiple-sessions-single-user',
    name: 'Multiple Okta Sessions Detected for a Single User',
    prompt:
      "Detects when a user has started multiple Okta sessions with the same user account and different session IDs. This may indicate that an attacker has stolen the user's session cookie and is using it to access the user's account from a different location.\n\nAvailable data: logs-okta.system*",
    description:
      "Detects when a user has started multiple Okta sessions with the same user account and different session IDs. This may indicate that an attacker has stolen the user's session cookie and is using it to access the user's account from a different location.",
    query: `event.dataset:okta.system
 and okta.event_type:user.session.start
 and okta.authentication_context.external_session_id:*
 and not (okta.actor.id: okta* or okta.actor.display_name: okta*)`,
    threat: [{ technique: 'T1550', tactic: 'TA0008', subtechnique: 'Web Session Cookie' }],
    severity: 'medium',
    tags: [
      'Use Case: Identity and Access Audit',
      'Data Source: Okta',
      'Tactic: Lateral Movement',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-35m',
    category: 'lateral_movement',
    type: 'threshold',
    language: 'kuery',
    interval: '30m',
    esqlQuery: `FROM logs-okta.system* metadata _id, _version, _index
| WHERE event.dataset == "okta.system"
    AND okta.event_type == "user.session.start"
    AND okta.authentication_context.external_session_id IS NOT NULL
    AND NOT (okta.actor.id like "okta*" OR okta.actor.display_name like "okta*")`,
  },
];
