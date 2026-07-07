/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ComplianceStatus = 'RED' | 'AMBER' | 'GREEN' | 'NOT_APPLICABLE' | 'NOT_ASSESSABLE';

export type ComplianceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ASSESSABLE';

export type VerdictType = 'rows_mean_violation' | 'rows_mean_evidence';

/**
 * PCI compliance ES|QL queries are built as static templates that reference two named
 * parameters, `?_tstart` and `?_tend`. The time-range values are **never** interpolated
 * into the query string — they are bound by the Elasticsearch ES|QL engine via the
 * `params` array on the request. This is the equivalent of SQL prepared statements and is
 * the security boundary against ES|QL injection attempts in user-supplied time ranges.
 *
 * The index pattern in the `FROM` clause cannot be parameterised by ES|QL today, so the
 * caller must ensure the value has been validated against {@link pciIndexPatternSchema}
 * in `./pci_compliance_schemas.ts` before being passed to these builders.
 */
export interface PciRequirementDefinition {
  id: string;
  name: string;
  description: string;
  pciReference: string;
  requiredFields: string[];
  verdict: VerdictType;
  defaultLookbackDays: number;
  recommendations: string[];
  buildViolationEsql?: (indexPattern: string) => string;
  buildCoverageEsql: (indexPattern: string) => string;
}

export const DEFAULT_PCI_INDEX_PATTERNS = ['logs-*', 'metrics-*', 'endgame-*'] as const;

/**
 * Shared WHERE fragment that constrains every PCI compliance query to the caller's time
 * range. The `?_tstart` / `?_tend` placeholders are bound as ES|QL parameters — see
 * {@link buildPciTimeRangeParams}.
 */
const TIME_WINDOW = '@timestamp >= ?_tstart AND @timestamp <= ?_tend';

const coverageQuery = (indexPattern: string, whereClause: string): string =>
  `FROM ${indexPattern} | WHERE ${TIME_WINDOW} AND ${whereClause} | STATS matching_events = COUNT(*) | LIMIT 1`;

export const PCI_REQUIREMENTS: Record<string, PciRequirementDefinition> = {
  // ── Top-level coverage checks (requirements 1–12) ──────────────────────

  '1': {
    id: '1',
    name: 'Install and Maintain Network Security Controls',
    description:
      'Evaluate evidence of monitored network control activity and denied/filtered traffic.',
    pciReference: 'PCI DSS v4.0.1 Requirement 1',
    requiredFields: ['event.category', 'source.ip', 'destination.ip', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Ensure network segmentation and firewall policy updates are continuously logged.',
      'Review denied network traffic trends and tune policies for high-risk paths.',
    ],
    buildCoverageEsql: (i) => coverageQuery(i, 'event.category == "network"'),
  },
  '2': {
    id: '2',
    name: 'Apply Secure Configurations to All System Components',
    description: 'Assess configuration and hardening event coverage.',
    pciReference: 'PCI DSS v4.0.1 Requirement 2',
    requiredFields: ['event.category', 'event.action', 'host.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Centralize secure baseline changes and monitor drift across critical systems.',
      'Track hardening exceptions with expiration and compensating controls.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "configuration" OR event.action LIKE "*config*"'),
  },
  '3': {
    id: '3',
    name: 'Protect Stored Account Data',
    description:
      'Validate telemetry indicating controls around sensitive data access and storage. Most sub-controls require manual process verification.',
    pciReference: 'PCI DSS v4.0.1 Requirement 3',
    requiredFields: ['event.category', 'event.action', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Monitor sensitive data access and verify retention/deletion controls are audited.',
      'Supplement with manual evidence: data-flow diagrams, encryption key inventories, and PAN discovery scans.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "database" OR event.action LIKE "*data*access*"'),
  },
  '4': {
    id: '4',
    name: 'Protect Cardholder Data with Strong Cryptography During Transmission',
    description: 'Check for evidence of cryptographic telemetry in network communication events.',
    pciReference: 'PCI DSS v4.0.1 Requirement 4',
    requiredFields: ['tls.version', 'network.protocol', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Ensure TLS metadata is ingested and monitor weak/legacy protocol usage.',
      'Alert on unencrypted transport observed in cardholder-data paths.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'tls.version IS NOT NULL OR network.protocol IS NOT NULL'),
  },
  '5': {
    id: '5',
    name: 'Protect All Systems and Networks from Malicious Software',
    description: 'Evaluate malware-related event visibility and prevention telemetry.',
    pciReference: 'PCI DSS v4.0.1 Requirement 5',
    requiredFields: ['event.category', 'event.module', 'host.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Confirm endpoint telemetry for malware prevention and detection is complete.',
      'Investigate hosts repeatedly reporting malware indicators.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "malware" OR event.module == "endpoint"'),
  },
  '6': {
    id: '6',
    name: 'Develop and Maintain Secure Systems and Software',
    description: 'Assess vulnerability and patch-related telemetry availability.',
    pciReference: 'PCI DSS v4.0.1 Requirement 6',
    requiredFields: ['vulnerability.id', 'vulnerability.severity', 'host.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Track remediation SLAs for critical vulnerabilities and overdue patches.',
      'Correlate vulnerability findings with internet-facing assets.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'vulnerability.id IS NOT NULL OR event.action LIKE "*patch*"'),
  },
  '7': {
    id: '7',
    name: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
    description: 'Check role/authorization telemetry that supports least-privilege monitoring.',
    pciReference: 'PCI DSS v4.0.1 Requirement 7',
    requiredFields: ['event.category', 'user.name', 'event.action', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Review privilege grants and access exceptions for least-privilege alignment.',
      'Monitor unusual privileged access across critical systems.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "iam" OR event.action LIKE "*role*" OR event.action LIKE "*privilege*"'
      ),
  },
  '8': {
    id: '8',
    name: 'Identify Users and Authenticate Access to System Components',
    description: 'Evaluate authentication telemetry quality and failed-authentication patterns.',
    pciReference: 'PCI DSS v4.0.1 Requirement 8',
    requiredFields: ['event.category', 'event.outcome', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Ensure MFA-related events are ingested for interactive user authentication.',
      'Investigate concentrated failed authentication activity by user or source.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "authentication" OR event.action LIKE "*login*"'),
  },
  '9': {
    id: '9',
    name: 'Restrict Physical Access to Cardholder Data',
    description:
      'Physical access controls are primarily process-based. SIEM data can supplement but not fully validate this requirement.',
    pciReference: 'PCI DSS v4.0.1 Requirement 9',
    requiredFields: ['event.category', 'event.action', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Integrate badge/physical access systems where available for end-to-end traceability.',
      'Document manual evidence collection for physical controls not represented in logs.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "physical_access" OR event.action LIKE "*badge*"'),
  },
  '10': {
    id: '10',
    name: 'Log and Monitor All Access to System Components and Cardholder Data',
    description: 'Measure breadth and continuity of audit logging and monitoring coverage.',
    pciReference: 'PCI DSS v4.0.1 Requirement 10',
    requiredFields: ['event.category', 'event.module', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Validate audit logging across critical systems and identity providers.',
      'Monitor ingestion gaps and logging outages as priority control failures.',
    ],
    buildCoverageEsql: (i) => coverageQuery(i, 'event.category IS NOT NULL'),
  },
  '11': {
    id: '11',
    name: 'Test Security of Systems and Networks Regularly',
    description: 'Assess evidence of testing outcomes such as intrusion and vulnerability results.',
    pciReference: 'PCI DSS v4.0.1 Requirement 11',
    requiredFields: ['event.category', 'vulnerability.id', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Track recurring security test cadence and unresolved high-risk findings.',
      'Correlate intrusion alerts with control test outcomes for validation.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "intrusion_detection" OR vulnerability.id IS NOT NULL'),
  },
  '12': {
    id: '12',
    name: 'Support Information Security with Organizational Policies and Programs',
    description:
      'Policy and governance controls are primarily process-based. Use policy/change telemetry as supportive evidence.',
    pciReference: 'PCI DSS v4.0.1 Requirement 12',
    requiredFields: ['event.category', 'event.action', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Maintain periodic policy review records and map owners to each PCI control area.',
      'Supplement telemetry-based checks with documented procedural evidence for audits.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.action LIKE "*policy*" OR event.category == "configuration"'),
  },

  // ── Sub-requirement violation checks ───────────────────────────────────

  '1.2.1': {
    id: '1.2.1',
    name: 'Network Security Control Configuration Changes',
    description:
      'Detect firewall rule, security group, and network ACL changes. PCI DSS v4.0.1 requires all changes to be documented through a formal change management process.',
    pciReference: 'PCI DSS v4.0.1 Section 1.2.1',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Ensure all NSC changes are correlated with approved change tickets.',
      'Flag changes made outside of approved change windows.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "configuration" AND (event.action LIKE "*security_group*" OR event.action LIKE "*firewall*" OR event.action LIKE "*network_acl*" OR event.action LIKE "*rule*")'
      ),
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND event.category == "configuration" AND (event.action LIKE "*security_group*" OR event.action LIKE "*firewall*" OR event.action LIKE "*network_acl*") | STATS change_count = COUNT(*) BY event.action, user.name | SORT change_count DESC | LIMIT 50`,
  },

  '4.2.1': {
    id: '4.2.1',
    name: 'Strong Cryptography for Data in Transit',
    description:
      'Identify weak or legacy TLS/SSL versions (TLS 1.0, 1.1, SSLv2, SSLv3) in network traffic. PCI DSS v4.0.1 requires strong cryptography for all transmissions of cardholder data.',
    pciReference: 'PCI DSS v4.0.1 Section 4.2.1',
    requiredFields: ['tls.version', 'destination.ip', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 30,
    recommendations: [
      'Disable TLS 1.0 and 1.1 on all systems processing cardholder data.',
      'Upgrade to TLS 1.2 or 1.3 and restrict cipher suites to strong algorithms.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND (` +
      `(tls.version IS NOT NULL AND tls.version IN ("1.0", "1.1", "SSLv3", "SSLv2")) OR ` +
      `(network.protocol == "http" AND tls.version IS NULL)` +
      `) | STATS connection_count = COUNT(*) BY destination.ip, tls.version | SORT connection_count DESC | LIMIT 50`,
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'tls.version IS NOT NULL OR network.protocol IS NOT NULL'),
  },

  '5.2.1': {
    id: '5.2.1',
    name: 'Anti-Malware Deployed on All System Components',
    description:
      'Verify that anti-malware telemetry is present from endpoints. The presence of malware events confirms anti-malware solutions are deployed and active.',
    pciReference: 'PCI DSS v4.0.1 Section 5.2.1',
    requiredFields: ['event.category', 'host.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Ensure all in-scope endpoints report anti-malware telemetry.',
      'Investigate hosts missing malware prevention event coverage.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "malware" OR event.module == "endpoint" OR event.action LIKE "*malware*" OR event.action LIKE "*virus*"'
      ),
  },

  '6.3.3': {
    id: '6.3.3',
    name: 'Critical Vulnerability Patching Within 30 Days',
    description:
      'Identify unpatched critical-severity vulnerabilities. PCI DSS v4.0.1 requires critical vulnerabilities to be patched within 30 days of discovery. Note: v4.0.1 narrowed this from critical+high (in v4.0) to critical-only.',
    pciReference: 'PCI DSS v4.0.1 Section 6.3.3',
    requiredFields: ['vulnerability.id', 'vulnerability.severity', 'host.name', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 30,
    recommendations: [
      'Prioritize remediation of critical-severity vulnerabilities within 30 days.',
      'Establish compensating controls for vulnerabilities that cannot be patched within the SLA.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND vulnerability.id IS NOT NULL AND vulnerability.severity == "critical" | STATS vuln_count = COUNT(*) BY vulnerability.id, host.name | SORT vuln_count DESC | LIMIT 50`,
    buildCoverageEsql: (i) => coverageQuery(i, 'vulnerability.id IS NOT NULL'),
  },

  '7.2.2': {
    id: '7.2.2',
    name: 'Access Control and Privilege Assignment',
    description:
      'Monitor role assignments, privilege grants, and group membership changes. PCI DSS v4.0.1 requires access to be assigned based on job classification and function.',
    pciReference: 'PCI DSS v4.0.1 Section 7.2.2',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Review privilege grants and ensure they align with least-privilege principles.',
      'Alert on role assignments to highly privileged groups outside of change windows.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "iam" AND (event.action LIKE "*role*" OR event.action LIKE "*group*" OR event.action LIKE "*privilege*" OR event.action LIKE "*permission*")'
      ),
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND event.category == "iam" AND (event.action LIKE "*role*assign*" OR event.action LIKE "*group*add*" OR event.action LIKE "*privilege*grant*") | STATS change_count = COUNT(*) BY user.name, event.action | SORT change_count DESC | LIMIT 50`,
  },

  '8.2.4': {
    id: '8.2.4',
    name: 'Inactive Account Management',
    description:
      'Identify user accounts that have not authenticated within 90 days. PCI DSS v4.0.1 requires removal or disabling of inactive accounts within 90 days.',
    pciReference: 'PCI DSS v4.0.1 Section 8.2.4',
    requiredFields: ['event.category', 'event.outcome', 'user.name', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 365,
    recommendations: [
      'Disable or remove accounts with no successful authentication in 90+ days.',
      'Implement automated account lifecycle management with periodic reviews.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND event.category == "authentication" AND event.outcome == "success" | STATS last_login = MAX(@timestamp) BY user.name | EVAL days_inactive = DATE_DIFF("day", last_login, NOW()) | WHERE days_inactive > 90 | SORT days_inactive DESC | LIMIT 50`,
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "authentication" AND event.outcome == "success"'),
  },

  '8.3.4': {
    id: '8.3.4',
    name: 'Account Lockout After Failed Attempts',
    description:
      'Detect accounts with excessive failed login attempts that exceed the PCI DSS v4.0.1 lockout threshold of 10 attempts, indicating lockout mechanisms may not be enforced.',
    pciReference: 'PCI DSS v4.0.1 Section 8.3.4',
    requiredFields: ['event.category', 'event.outcome', 'user.name', 'source.ip', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 7,
    recommendations: [
      'Configure account lockout after no more than 10 invalid login attempts per PCI DSS v4.0.1.',
      'Ensure lockout duration is at least 30 minutes or requires administrator unlock with identity verification.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND event.category == "authentication" AND event.outcome == "failure" | STATS failed_attempts = COUNT(*) BY user.name, source.ip | WHERE failed_attempts > 10 | SORT failed_attempts DESC | LIMIT 50`,
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "authentication" AND event.outcome == "failure"'),
  },

  '8.4.2': {
    id: '8.4.2',
    name: 'MFA for All CDE Access',
    description:
      'Verify that MFA-related authentication events exist. PCI DSS v4.0.1 broadened the MFA requirement to ALL access into the CDE, not just administrative. Phishing-resistant authentication (FIDO2/WebAuthn) can substitute for traditional MFA for non-admin access.',
    pciReference: 'PCI DSS v4.0.1 Section 8.4.2',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Enforce MFA for all interactive access into the cardholder data environment.',
      'Consider phishing-resistant factors (FIDO2/WebAuthn) which satisfy MFA requirements per v4.0.1.',
      'Ensure MFA-related events (challenge, verify, enroll) are ingested into SIEM.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "authentication" AND (event.action LIKE "*mfa*" OR event.action LIKE "*multi_factor*" OR event.action LIKE "*2fa*" OR event.action LIKE "*totp*" OR event.action LIKE "*fido*" OR event.action LIKE "*webauthn*" OR event.action LIKE "*verify*factor*")'
      ),
  },

  '10.2.1': {
    id: '10.2.1',
    name: 'Audit Trail Integrity',
    description:
      'Detect audit log stop, pause, deletion, or tampering events. PCI DSS v4.0.1 requires audit trails to be protected from modification.',
    pciReference: 'PCI DSS v4.0.1 Section 10.2.1',
    requiredFields: ['event.category', 'event.action', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 30,
    recommendations: [
      'Investigate any audit log stop, pause, or deletion events immediately.',
      'Implement write-once log storage to prevent tampering.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND (event.action LIKE "*audit*stop*" OR event.action LIKE "*audit*delete*" OR event.action LIKE "*audit*pause*" OR event.action LIKE "*log*clear*" OR event.action LIKE "*log*delete*" OR event.action LIKE "*trail*stop*") | STATS event_count = COUNT(*) BY event.action, host.name, user.name | SORT event_count DESC | LIMIT 50`,
    buildCoverageEsql: (i) => coverageQuery(i, 'event.category IS NOT NULL'),
  },

  '10.2.2': {
    id: '10.2.2',
    name: 'Administrative Action Logging',
    description:
      'Verify that actions by individuals with administrative privileges are logged. PCI DSS v4.0.1 requires audit trails for all actions by admins.',
    pciReference: 'PCI DSS v4.0.1 Section 10.2.2',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 7,
    recommendations: [
      'Ensure all administrative actions including config changes, user management, and system modifications are logged.',
      'Correlate admin actions with change management records.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "configuration" OR event.category == "iam" OR event.action LIKE "*admin*" OR event.action LIKE "*sudo*" OR event.action LIKE "*root*"'
      ),
  },

  '10.5': {
    id: '10.5',
    name: 'Audit Log Retention',
    description:
      'Verify that audit log history is retained for at least 12 months with the last 3 months immediately available. Check for the oldest available log timestamp.',
    pciReference: 'PCI DSS v4.0.1 Section 10.5',
    requiredFields: ['@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 365,
    recommendations: [
      'Ensure log retention policies maintain at least 12 months of audit logs.',
      'Verify that the most recent 3 months of logs are immediately available for analysis.',
    ],
    // Retention intentionally spans the full index rather than the caller-supplied window,
    // so this query has no WHERE clause on @timestamp — there is no user-supplied time
    // value to bind. `total_events` is projected first so the evaluator's generic
    // `values[0][0]` count-based scoring path treats "any events exist" as evidence;
    // `oldest_log`, `newest_log`, and `retention_days` remain available as context for
    // reviewers inspecting raw evidence.
    buildCoverageEsql: (i) =>
      `FROM ${i} | STATS total_events = COUNT(*), oldest_log = MIN(@timestamp), newest_log = MAX(@timestamp) | EVAL retention_days = DATE_DIFF("day", oldest_log, newest_log)`,
  },

  '11.5': {
    id: '11.5',
    name: 'Intrusion Detection and Prevention',
    description:
      'Verify that IDS/IPS alerts are present and being monitored. Active alerts may indicate ongoing security incidents that need investigation.',
    pciReference: 'PCI DSS v4.0.1 Section 11.5',
    requiredFields: ['event.category', 'event.kind', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 7,
    recommendations: [
      'Investigate and resolve active IDS/IPS alerts promptly.',
      'Tune detection rules to reduce false positives while maintaining coverage.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND event.category == "intrusion_detection" AND event.kind == "alert" | STATS alert_count = COUNT(*) BY host.name, event.action | SORT alert_count DESC | LIMIT 50`,
    buildCoverageEsql: (i) => coverageQuery(i, 'event.category == "intrusion_detection"'),
  },

  '2.2.4': {
    id: '2.2.4',
    name: 'Default and Unnecessary Account Management',
    description:
      'Detect usage of default, vendor-supplied, or generic accounts. PCI DSS v4.0.1 requires that default accounts are removed, disabled, or have passwords changed before systems are deployed.',
    pciReference: 'PCI DSS v4.0.1 Section 2.2.4',
    requiredFields: ['event.category', 'event.outcome', 'user.name', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 90,
    recommendations: [
      'Remove or disable all default and vendor-supplied accounts before deploying systems.',
      'If a default account cannot be removed, change the password and restrict access.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND event.category == "authentication" AND event.outcome == "success" AND (user.name == "admin" OR user.name == "administrator" OR user.name == "root" OR user.name == "guest" OR user.name == "default" OR user.name == "test" OR user.name == "sa" OR user.name == "postgres" OR user.name == "oracle") | STATS login_count = COUNT(*) BY user.name, source.ip | SORT login_count DESC | LIMIT 50`,
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category == "authentication" AND event.outcome == "success"'),
  },

  '8.3.6': {
    id: '8.3.6',
    name: 'Password Complexity Requirements',
    description:
      'Verify that password policy events indicate enforcement of minimum complexity. PCI DSS v4.0.1 requires passwords of at least 12 characters containing both numeric and alphabetic characters. Systems that cannot support 12 characters must enforce a minimum of 8 with documented justification.',
    pciReference: 'PCI DSS v4.0.1 Section 8.3.6',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 30,
    recommendations: [
      'Enforce minimum 12-character passwords with both numeric and alphabetic characters per PCI DSS v4.0.1.',
      'If systems cannot support 12 characters, document compensating controls and enforce 8-character minimum.',
      'Ensure password policy change events are ingested into SIEM for auditability.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "iam" AND (event.action LIKE "*password*policy*" OR event.action LIKE "*password*change*" OR event.action LIKE "*password*reset*" OR event.action LIKE "*credential*")'
      ),
  },

  '8.3.9': {
    id: '8.3.9',
    name: 'Password Rotation or MFA Enforcement',
    description:
      'PCI DSS v4.0.1 requires that passwords are changed every 90 days OR that MFA is implemented. The password-only option is eliminated. Check for either password change events or MFA enrollment/usage.',
    pciReference: 'PCI DSS v4.0.1 Section 8.3.9',
    requiredFields: ['event.category', 'event.action', 'user.name', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 90,
    recommendations: [
      'Either enforce password rotation every 90 days or implement MFA for all users.',
      'PCI DSS v4.0.1 eliminated the password-only option: MFA is the preferred path.',
      'Ensure password change and MFA enrollment events are ingested for audit evidence.',
    ],
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.category == "iam" AND (event.action LIKE "*password*change*" OR event.action LIKE "*password*reset*" OR event.action LIKE "*mfa*enroll*" OR event.action LIKE "*mfa*register*" OR event.action LIKE "*2fa*" OR event.action LIKE "*totp*")'
      ),
  },

  '10.3': {
    id: '10.3',
    name: 'Audit Log Entry Detail Completeness',
    description:
      'Verify that audit log entries contain required detail: user ID, event type, date/time, success or failure indication, origination, and identity or name of affected data/resource. Check field fill rates for completeness.',
    pciReference: 'PCI DSS v4.0.1 Section 10.3',
    requiredFields: ['user.name', 'event.category', 'event.action', 'event.outcome', '@timestamp'],
    verdict: 'rows_mean_evidence',
    defaultLookbackDays: 7,
    recommendations: [
      'Ensure all audit log entries include user ID, event type, timestamp, outcome, and source.',
      'Investigate data sources with low field fill rates for required audit trail fields.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} | STATS total = COUNT(*), has_user = COUNT(user.name), has_action = COUNT(event.action), has_outcome = COUNT(event.outcome) | EVAL user_pct = ROUND((has_user * 100.0) / total), action_pct = ROUND((has_action * 100.0) / total), outcome_pct = ROUND((has_outcome * 100.0) / total) | LIMIT 1`,
    buildCoverageEsql: (i) =>
      coverageQuery(i, 'event.category IS NOT NULL AND user.name IS NOT NULL'),
  },

  '11.6': {
    id: '11.6',
    name: 'Payment Page Tamper Detection',
    description:
      'Detect unauthorized changes to payment page content or HTTP headers. PCI DSS v4.0.1 requires change-detection and tamper-detection mechanisms on payment pages. Mandatory since March 31, 2025.',
    pciReference: 'PCI DSS v4.0.1 Section 11.6',
    requiredFields: ['event.category', 'event.action', 'url.domain', '@timestamp'],
    verdict: 'rows_mean_violation',
    defaultLookbackDays: 7,
    recommendations: [
      'Implement content security policy (CSP) and subresource integrity (SRI) on all payment pages.',
      'Deploy change-detection mechanisms that alert on unauthorized script or header modifications.',
      'This requirement became mandatory March 31, 2025 per PCI DSS v4.0.1.',
    ],
    buildViolationEsql: (i) =>
      `FROM ${i} | WHERE ${TIME_WINDOW} AND (event.action LIKE "*tamper*" OR event.action LIKE "*integrity*violation*" OR event.action LIKE "*csp*violation*" OR event.action LIKE "*script*inject*" OR event.action LIKE "*page*change*" OR event.action LIKE "*skimmer*") | STATS alert_count = COUNT(*) BY url.domain, event.action | SORT alert_count DESC | LIMIT 50`,
    buildCoverageEsql: (i) =>
      coverageQuery(
        i,
        'event.action LIKE "*csp*" OR event.action LIKE "*integrity*" OR event.action LIKE "*tamper*" OR event.action LIKE "*payment*page*"'
      ),
  },
};

/**
 * Build the ES|QL `params` array for the shared `?_tstart` / `?_tend` placeholders. Pass
 * the result straight to {@link executeEsql} so time-range values flow through
 * parameter binding instead of string interpolation.
 */
export const buildPciTimeRangeParams = ({
  from,
  to,
}: {
  from: string;
  to: string;
}): Array<Record<string, string>> => [{ _tstart: from }, { _tend: to }];

export const getTimeRangeForCheck = (
  checkId: string,
  userTimeRange?: { from: string; to: string }
): { from: string; to: string } => {
  if (userTimeRange) {
    return userTimeRange;
  }
  const days = PCI_REQUIREMENTS[checkId]?.defaultLookbackDays ?? 90;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const getDefaultTimeRange = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const normalizeRequirementId = (requirement: string): string | null => {
  if (requirement === 'all') {
    return requirement;
  }
  if (PCI_REQUIREMENTS[requirement]) {
    return requirement;
  }
  const baseRequirement = requirement.split('.')[0];
  return PCI_REQUIREMENTS[baseRequirement] ? baseRequirement : null;
};

export const resolveRequirementIds = (requirements?: string[]): string[] => {
  if (!requirements || requirements.length === 0 || requirements.includes('all')) {
    return Object.keys(PCI_REQUIREMENTS);
  }

  const expanded = new Set<string>();
  for (const req of requirements) {
    const normalized = normalizeRequirementId(req);
    if (normalized && normalized !== 'all') {
      expanded.add(normalized);
      for (const key of Object.keys(PCI_REQUIREMENTS)) {
        if (key.startsWith(`${normalized}.`)) {
          expanded.add(key);
        }
      }
    }
  }
  return [...expanded];
};

export const getIndexPattern = (indices?: string[]): string => {
  const selected = indices && indices.length > 0 ? indices : [...DEFAULT_PCI_INDEX_PATTERNS];
  return selected.join(',');
};

export const getIndexList = (indices?: string[]): string[] =>
  indices && indices.length > 0 ? [...indices] : [...DEFAULT_PCI_INDEX_PATTERNS];
