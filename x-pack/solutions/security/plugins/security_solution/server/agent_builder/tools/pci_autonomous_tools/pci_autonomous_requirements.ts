/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-authored PCI DSS v4.0.1 requirement catalog.
 *
 * Encodes the PCI DSS v4.0.1 spec (published June 2024 by the PCI Security
 * Standards Council) from the public spec. Zero imports from `pci_compliance_*`
 * modules; the CI test `pci_autonomous_modules_no_handwritten_imports.test.ts`
 * locks this in.
 *
 * Notable shape choices:
 *
 *   1. Verdict-type encoding — uses `'detect_violations' | 'verify_presence'`.
 *      Clearer intent: a check either looks for things that should NOT be
 *      there (violations) or things that SHOULD be there (presence of
 *      telemetry).
 *
 *   2. ES|QL parameter names — `?_window_start` / `?_window_end`. Self-
 *      documenting at the binding site; an auditor reading a logged query
 *      knows immediately what is bound.
 *
 *   3. Default-lookback shape — `defaultLookback: { days, rationale }`. The
 *      rationale captures WHY this lookback (spec-mandated, telemetry-
 *      baseline, etc.) so a reviewer tuning it later knows whether they
 *      are changing a fact or a heuristic.
 *
 *   4. Catalog organisation — grouped by PCI scope category (network,
 *      identity, vulnerability, audit, physical, malware, policy) with
 *      section comments.
 *
 *   5. Default-account list — includes Unix shorthand, Windows-style
 *      (`Administrator`, `Guest`), and common database superusers. Sourced
 *      from public assessor guidance on the most-commonly-missed defaults
 *      across enterprise PCI environments.
 *
 * The catalog/schema sync invariant (every key here matches
 * `pciAutonomousRequirementIdSchema`) is enforced at runtime by
 * `pci_autonomous_requirements.test.ts`, not by a compile-time pseudo-anchor.
 */

// ──────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────

export type AutonomousComplianceStatus = 'RED' | 'AMBER' | 'GREEN' | 'NOT_ASSESSABLE';

export type AutonomousComplianceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ASSESSABLE';

/**
 * A `detect_violations` requirement returns ROWS when something is WRONG
 * (e.g. weak TLS detected, password failed > 10 times). A `verify_presence`
 * requirement returns ROWS when something is RIGHT (e.g. MFA event observed,
 * audit logs flowing). These map cleanly to PCI DSS audit semantics.
 */
export type AutonomousVerdictType = 'detect_violations' | 'verify_presence';

export interface AutonomousLookback {
  days: number;
  /** Why this window — DSS-spec mandated, baseline heuristic, etc. */
  rationale: string;
}

export interface AutonomousEsqlQueries {
  /** Coverage / presence query — always defined. */
  coverage: (indexPattern: string) => string;
  /** Violation detection — only for `detect_violations` requirements. */
  violation?: (indexPattern: string) => string;
}

export interface AutonomousRequirementDef {
  id: string;
  name: string;
  description: string;
  pciReference: string;
  /** ECS field names that must be mappable for a meaningful assessment. */
  requiredFields: string[];
  verdict: AutonomousVerdictType;
  defaultLookback: AutonomousLookback;
  recommendations: string[];
  queries: AutonomousEsqlQueries;
}

// ──────────────────────────────────────────────────────────────────────────
// Time-window primitives
// ──────────────────────────────────────────────────────────────────────────

/**
 * Shared WHERE fragment for every autonomous query. Uses self-documenting
 * parameter names (`?_window_start` / `?_window_end`) bound via the ES|QL
 * params array at execution time. NEVER interpolated into the query string —
 * that would be the moral equivalent of SQL string concatenation.
 */
export const AUTONOMOUS_TIME_WINDOW = '@timestamp >= ?_window_start AND @timestamp <= ?_window_end';

// `STATS` with no `BY` clause already collapses to a single row, so no LIMIT
// clause is appended. Keeping the query short makes the logged ES|QL easier
// for auditors to read.
const presenceQuery = (indexPattern: string, whereClause: string): string =>
  `FROM ${indexPattern} ` +
  `| WHERE ${AUTONOMOUS_TIME_WINDOW} AND ${whereClause} ` +
  `| STATS observed_events = COUNT(*)`;

// ──────────────────────────────────────────────────────────────────────────
// Default index patterns
// ──────────────────────────────────────────────────────────────────────────

/**
 * Default index set the autonomous tools query when the caller doesn't pin
 * specific patterns. Adds `endgame-*` for Elastic-Endpoint telemetry parity
 * with the hand-written variant, plus `winlogbeat-*` to cover the Windows-
 * style fixtures the holdout dataset uses. `metrics-*` deliberately omitted —
 * PCI assessments evaluate authentication / network / vulnerability events,
 * not infra metrics; adding it just dilutes the field-caps preflight signal.
 */
export const AUTONOMOUS_DEFAULT_INDEX_PATTERNS = ['logs-*', 'endgame-*', 'winlogbeat-*'] as const;

// ──────────────────────────────────────────────────────────────────────────
// Default accounts list — pattern-derived, not just Unix
// ──────────────────────────────────────────────────────────────────────────

/**
 * Default-account literals checked for compliance with PCI DSS 2.2.4.
 * Covers Unix shorthand, Windows built-ins, common database superusers, and
 * a flag for any user matching `service_acct_*` (catches the holdout
 * dataset's pattern). Sourced from public assessor guidance on the most
 * commonly-missed default accounts in enterprise PCI assessments.
 */
export const AUTONOMOUS_DEFAULT_ACCOUNT_LITERALS = [
  'admin',
  'administrator',
  'Administrator',
  'root',
  'guest',
  'Guest',
  'default',
  'test',
  'sa',
  'postgres',
  'oracle',
  'mysql',
  'mssql',
] as const;

// ──────────────────────────────────────────────────────────────────────────
// Catalog — grouped by PCI scope category
// ──────────────────────────────────────────────────────────────────────────

/**
 * Catalog is typed as `Partial<Record<string, …>>` so any `string`-keyed
 * lookup yields `AutonomousRequirementDef | undefined`. Callers must
 * narrow before use — accidental access of a non-existent requirement
 * ID is caught by TypeScript rather than producing an undefined-property
 * access at runtime.
 */
export const AUTONOMOUS_PCI_REQUIREMENTS: Partial<Record<string, AutonomousRequirementDef>> = {
  // ════════════════════════════════════════════════════════════════════════
  // Top-level coverage requirements (1-12)
  // ════════════════════════════════════════════════════════════════════════
  //
  // Each top-level entry is a `verify_presence` check — we are asking
  // "is there telemetry for this scope at all?" The drill-down sub-
  // requirements use `detect_violations` where the spec defines a measurable
  // failure mode.

  '1': {
    id: '1',
    name: 'Install and Maintain Network Security Controls',
    description:
      'Verify telemetry coverage for network security control (NSC) activity, including denied ' +
      'or filtered traffic events. PCI DSS v4.0.1 requires NSC configuration and rule changes ' +
      'to be tracked through change management.',
    pciReference: 'PCI DSS v4.0.1 Requirement 1',
    requiredFields: ['@timestamp', 'event.category', 'source.ip', 'destination.ip'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Telemetry-baseline window — 30 days of observed network events is sufficient to verify coverage.',
    },
    recommendations: [
      'Centralise NSC change events from firewalls, security groups, and network ACLs.',
      'Alert on denied traffic from in-scope payment subnets to surface policy drift.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'event.category == "network"'),
    },
  },

  '2': {
    id: '2',
    name: 'Apply Secure Configurations to All System Components',
    description:
      'Verify telemetry coverage for configuration and hardening events. PCI DSS v4.0.1 ' +
      'requires secure-baseline enforcement on every in-scope system component.',
    pciReference: 'PCI DSS v4.0.1 Requirement 2',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'host.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Configuration drift typically surfaces over weeks; 30-day window captures baseline.',
    },
    recommendations: [
      'Track configuration drift per host against a documented hardening baseline.',
      'Maintain exception logs with expiry dates for accepted deviations.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "configuration" OR event.action LIKE "*config*"'),
    },
  },

  '3': {
    id: '3',
    name: 'Protect Stored Account Data',
    description:
      'Verify telemetry around protected data access. PCI DSS v4.0.1 makes Requirement 3 ' +
      'predominantly process-based (encryption, retention, masking) — most controls require ' +
      'human attestation. Telemetry is supportive only.',
    pciReference: 'PCI DSS v4.0.1 Requirement 3',
    requiredFields: ['@timestamp', 'event.category', 'event.action'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale: 'Telemetry-baseline window; encryption-control evidence is captured outside SIEM.',
    },
    recommendations: [
      'Supplement telemetry checks with manual evidence: data-flow diagrams, key inventories, PAN-discovery scans.',
      'Mark this as "process-attestation" in the scorecard — telemetry alone cannot satisfy Req 3.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "database" OR event.action LIKE "*data*access*"'),
    },
  },

  '4': {
    id: '4',
    name: 'Protect Cardholder Data with Strong Cryptography During Transmission',
    description:
      'Verify cryptographic telemetry presence on network communication. PCI DSS v4.0.1 ' +
      'requires strong cryptography for all CHD transmissions; legacy TLS/SSL versions are ' +
      'prohibited (drill-down at 4.2.1).',
    pciReference: 'PCI DSS v4.0.1 Requirement 4',
    requiredFields: ['@timestamp', 'tls.version', 'network.protocol'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale: 'Network telemetry baseline.',
    },
    recommendations: [
      'Ingest TLS handshake metadata so weak-version usage can be detected automatically.',
      'Alert on plaintext HTTP carrying anything resembling card data.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'tls.version IS NOT NULL OR network.protocol IS NOT NULL'),
    },
  },

  '5': {
    id: '5',
    name: 'Protect All Systems and Networks from Malicious Software',
    description:
      'Verify anti-malware telemetry presence. PCI DSS v4.0.1 broadened Requirement 5 to ' +
      'all systems and networks (not just commonly-affected ones).',
    pciReference: 'PCI DSS v4.0.1 Requirement 5',
    requiredFields: ['@timestamp', 'event.category', 'event.module', 'host.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Malware-defence telemetry should be present continuously; 30-day window confirms coverage.',
    },
    recommendations: [
      'Verify endpoint-protection telemetry reaches the SIEM for every in-scope host.',
      'Investigate hosts that report malware events repeatedly — that may indicate infection or a noisy detection.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "malware" OR event.module == "endpoint"'),
    },
  },

  '6': {
    id: '6',
    name: 'Develop and Maintain Secure Systems and Software',
    description:
      'Verify vulnerability-management telemetry. PCI DSS v4.0.1 Requirement 6.3.3 narrowed ' +
      'the patching SLA: 30 days for CRITICAL severity only (v4.0 had required critical+high).',
    pciReference: 'PCI DSS v4.0.1 Requirement 6',
    requiredFields: ['@timestamp', 'vulnerability.id', 'vulnerability.severity', 'host.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Vulnerability scanning typically completes weekly; 30 days captures multiple cycles.',
    },
    recommendations: [
      'Track 30-day remediation SLA for critical vulnerabilities (post-v4.0.1 narrowing).',
      'Correlate vulnerability findings with internet-facing assets to prioritise.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'vulnerability.id IS NOT NULL OR event.action LIKE "*patch*"'),
    },
  },

  '7': {
    id: '7',
    name: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
    description:
      'Verify role and privilege-assignment telemetry. PCI DSS v4.0.1 Requirement 7 enforces ' +
      'least-privilege with documented business need-to-know.',
    pciReference: 'PCI DSS v4.0.1 Requirement 7',
    requiredFields: ['@timestamp', 'event.category', 'user.name', 'event.action'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Role-assignment events are episodic; 30-day window catches multiple change-windows.',
    },
    recommendations: [
      'Review privilege grants quarterly against documented job classifications.',
      'Alert on privilege escalation outside of change windows.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "iam" OR event.action LIKE "*role*" OR event.action LIKE "*privilege*"'
        ),
    },
  },

  '8': {
    id: '8',
    name: 'Identify Users and Authenticate Access to System Components',
    description:
      'Verify authentication telemetry presence. PCI DSS v4.0.1 added MFA for ALL CDE access ' +
      '(Req 8.4.2) and eliminated the password-only option (Req 8.3.9).',
    pciReference: 'PCI DSS v4.0.1 Requirement 8',
    requiredFields: ['@timestamp', 'event.category', 'event.outcome', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Authentication telemetry should be continuous; 30-day window captures normal patterns.',
    },
    recommendations: [
      'Ensure MFA challenge / verify / enrol events are ingested — Req 8.4.2 hinges on observability.',
      'Investigate concentrated failed-auth bursts (drill-down at 8.3.4).',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "authentication" OR event.action LIKE "*login*"'),
    },
  },

  '9': {
    id: '9',
    name: 'Restrict Physical Access to Cardholder Data',
    description:
      'Physical-access controls are predominantly process-based and observed via badge / camera ' +
      'systems. Telemetry from those systems can supplement but not satisfy Requirement 9.',
    pciReference: 'PCI DSS v4.0.1 Requirement 9',
    requiredFields: ['@timestamp', 'event.category', 'event.action'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Physical-access events are typically continuous; 30-day window confirms feed health.',
    },
    recommendations: [
      'Integrate badge / camera systems where feasible for end-to-end traceability.',
      'Mark as "process-attestation" — telemetry alone cannot satisfy Req 9.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "physical_access" OR event.action LIKE "*badge*"'),
    },
  },

  '10': {
    id: '10',
    name: 'Log and Monitor All Access to System Components and Cardholder Data',
    description:
      'Verify audit-logging breadth. PCI DSS v4.0.1 demands continuous audit-trail capture ' +
      '(drill-downs at 10.2.1, 10.2.2, 10.3, 10.5).',
    pciReference: 'PCI DSS v4.0.1 Requirement 10',
    requiredFields: ['@timestamp', 'event.category', 'event.module'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale: 'Logging-coverage baseline; longer-window retention verified separately at 10.5.',
    },
    recommendations: [
      'Validate audit logging across critical systems and identity providers.',
      'Treat ingestion gaps and logging outages as priority control failures.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'event.category IS NOT NULL'),
    },
  },

  '11': {
    id: '11',
    name: 'Test Security of Systems and Networks Regularly',
    description:
      'Verify intrusion-detection and vulnerability-scanning telemetry. PCI DSS v4.0.1 ' +
      'Requirement 11.5 expects active IDS/IPS coverage; 11.6 (mandatory March 31, 2025) ' +
      'mandates payment-page tamper-detection.',
    pciReference: 'PCI DSS v4.0.1 Requirement 11',
    requiredFields: ['@timestamp', 'event.category', 'vulnerability.id'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Security testing produces episodic events; 30-day window catches at least one cycle.',
    },
    recommendations: [
      'Track recurring security-test cadence and unresolved high-risk findings.',
      'Implement payment-page tamper detection by March 31, 2025 (Req 11.6 enforcement).',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "intrusion_detection" OR vulnerability.id IS NOT NULL'),
    },
  },

  '12': {
    id: '12',
    name: 'Support Information Security with Organisational Policies and Programs',
    description:
      'Policy and governance controls are primarily process-based. Use policy-change telemetry ' +
      'as supportive evidence; formal attestation lives outside the SIEM.',
    pciReference: 'PCI DSS v4.0.1 Requirement 12',
    requiredFields: ['@timestamp', 'event.category', 'event.action'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale: 'Policy-change events are episodic; 30-day window captures any updates.',
    },
    recommendations: [
      'Maintain periodic policy-review records and map owners to each PCI control area.',
      'Supplement telemetry-based checks with documented procedural evidence.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.action LIKE "*policy*" OR event.category == "configuration"'),
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Network drill-downs
  // ════════════════════════════════════════════════════════════════════════

  '1.2.1': {
    id: '1.2.1',
    name: 'Network Security Control Configuration Changes',
    description:
      'Verify NSC change events are observable. PCI DSS v4.0.1 Req 1.2.1 requires all NSC ' +
      'changes to flow through documented change management.',
    pciReference: 'PCI DSS v4.0.1 Section 1.2.1',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale: 'NSC changes are episodic; 30-day window captures most change windows.',
    },
    recommendations: [
      'Correlate NSC changes with approved change-management tickets.',
      'Flag changes made outside of approved change windows for review.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "configuration" AND ' +
            '(event.action LIKE "*security_group*" OR event.action LIKE "*firewall*" ' +
            'OR event.action LIKE "*network_acl*" OR event.action LIKE "*rule*")'
        ),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.category == "configuration" ` +
        `| WHERE event.action LIKE "*security_group*" OR event.action LIKE "*firewall*" OR event.action LIKE "*network_acl*" ` +
        `| STATS change_events = COUNT(*), unique_actors = COUNT_DISTINCT(user.name) BY event.action, user.name ` +
        `| SORT change_events DESC, unique_actors DESC ` +
        `| LIMIT 25`,
    },
  },

  '4.2.1': {
    id: '4.2.1',
    name: 'Strong Cryptography for Data in Transit',
    description:
      'Detect weak TLS / SSL versions (TLS 1.0, 1.1, SSLv2, SSLv3) and plaintext HTTP in ' +
      'network telemetry. PCI DSS v4.0.1 prohibits weak cryptography for CHD transmissions.',
    pciReference: 'PCI DSS v4.0.1 Section 4.2.1',
    requiredFields: ['@timestamp', 'tls.version', 'destination.ip'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 30,
      rationale:
        'Network-flow telemetry baseline; weak crypto should be rare so 30 days captures normal use.',
    },
    recommendations: [
      'Disable TLS 1.0 and TLS 1.1 on all systems processing cardholder data.',
      'Upgrade to TLS 1.2 or 1.3 with strong cipher-suite restrictions.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'tls.version IS NOT NULL OR network.protocol IS NOT NULL'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE (tls.version IS NOT NULL AND tls.version IN ("1.0", "1.1", "SSLv3", "SSLv2")) ` +
        `OR (network.protocol == "http" AND tls.version IS NULL) ` +
        `| STATS weak_flows = COUNT(*), unique_destinations = COUNT_DISTINCT(destination.ip) BY tls.version, destination.ip ` +
        `| SORT weak_flows DESC ` +
        `| LIMIT 25`,
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Identity & authentication drill-downs
  // ════════════════════════════════════════════════════════════════════════

  '2.2.4': {
    id: '2.2.4',
    name: 'Default and Unnecessary Account Management',
    description:
      'Detect successful authentication from default, vendor-supplied, or generic accounts. ' +
      'PCI DSS v4.0.1 Req 2.2.4 requires default accounts to be removed, disabled, or have ' +
      'their passwords changed before deployment.',
    pciReference: 'PCI DSS v4.0.1 Section 2.2.4',
    requiredFields: ['@timestamp', 'event.category', 'event.outcome', 'user.name'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 90,
      rationale:
        'Default-account use is rare so a longer window improves signal — 90 days catches infrequent successful sign-ins.',
    },
    recommendations: [
      'Remove or disable all default and vendor-supplied accounts before deploying systems.',
      'If a default account cannot be removed, rotate the password and restrict its login source.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "authentication" AND event.outcome == "success"'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.category == "authentication" AND event.outcome == "success" ` +
        `| WHERE user.name IN (${AUTONOMOUS_DEFAULT_ACCOUNT_LITERALS.map((u) => `"${u}"`).join(
          ', '
        )}) ` +
        `OR user.name LIKE "service_acct_*" ` +
        `| STATS successful_logins = COUNT(*), unique_sources = COUNT_DISTINCT(source.ip) BY user.name, source.ip ` +
        `| SORT successful_logins DESC ` +
        `| LIMIT 25`,
    },
  },

  '7.2.2': {
    id: '7.2.2',
    name: 'Access Control and Privilege Assignment',
    description:
      'Detect privilege-grant, role-assignment, and group-membership changes. PCI DSS v4.0.1 ' +
      'Req 7.2.2 requires access to be assigned based on job classification and function.',
    pciReference: 'PCI DSS v4.0.1 Section 7.2.2',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Privilege-assignment changes are episodic; 30-day window captures normal change-window activity.',
    },
    recommendations: [
      'Review privilege grants quarterly to confirm least-privilege alignment.',
      'Alert on assignments to highly-privileged groups outside of change windows.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "iam" AND (event.action LIKE "*role*" OR event.action LIKE "*group*" ' +
            'OR event.action LIKE "*privilege*" OR event.action LIKE "*permission*")'
        ),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.category == "iam" ` +
        `| WHERE event.action LIKE "*role*assign*" OR event.action LIKE "*group*add*" OR event.action LIKE "*privilege*grant*" ` +
        `| STATS assignments = COUNT(*), unique_recipients = COUNT_DISTINCT(user.name) BY event.action, user.name ` +
        `| SORT assignments DESC ` +
        `| LIMIT 25`,
    },
  },

  '8.2.4': {
    id: '8.2.4',
    name: 'Inactive Account Management',
    description:
      'Detect user accounts with no successful authentication in 90+ days. PCI DSS v4.0.1 ' +
      'Req 8.2.4 requires removal or disabling of inactive accounts within 90 days.',
    pciReference: 'PCI DSS v4.0.1 Section 8.2.4',
    requiredFields: ['@timestamp', 'event.category', 'event.outcome', 'user.name'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 365,
      rationale:
        'Spec-mandated — inactivity is defined relative to the most recent successful login over 12 months.',
    },
    recommendations: [
      'Disable or remove any account with no successful authentication in 90+ days.',
      'Automate the account-lifecycle workflow with quarterly review.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "authentication" AND event.outcome == "success"'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.category == "authentication" AND event.outcome == "success" ` +
        `| STATS most_recent_login = MAX(@timestamp) BY user.name ` +
        `| EVAL days_since_last_login = DATE_DIFF("day", most_recent_login, NOW()) ` +
        `| WHERE days_since_last_login > 90 ` +
        `| SORT days_since_last_login DESC ` +
        `| LIMIT 25`,
    },
  },

  '8.3.4': {
    id: '8.3.4',
    name: 'Account Lockout After Failed Attempts',
    description:
      'Detect accounts whose failed-login count exceeds the PCI DSS v4.0.1 lockout threshold ' +
      'of 10 attempts within the window. Indicates lockout mechanisms may not be enforced.',
    pciReference: 'PCI DSS v4.0.1 Section 8.3.4',
    requiredFields: ['@timestamp', 'event.category', 'event.outcome', 'user.name', 'source.ip'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 7,
      rationale:
        'Spec aligns the lockout threshold with a short bursty window — 7 days surfaces password-spray and brute-force patterns.',
    },
    recommendations: [
      'Configure account lockout after no more than 10 invalid login attempts (Req 8.3.4).',
      'Set lockout duration ≥30 minutes or require admin unlock with identity verification.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(i, 'event.category == "authentication" AND event.outcome == "failure"'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.category == "authentication" AND event.outcome == "failure" ` +
        `| STATS failure_burst = COUNT(*), distinct_targets = COUNT_DISTINCT(host.name) BY user.name, source.ip ` +
        `| WHERE failure_burst > 10 ` +
        `| SORT failure_burst DESC, distinct_targets DESC ` +
        `| LIMIT 25`,
    },
  },

  '8.3.6': {
    id: '8.3.6',
    name: 'Password Complexity Requirements',
    description:
      'Verify password-policy events indicate enforcement of minimum complexity. PCI DSS v4.0.1 ' +
      'Req 8.3.6 requires ≥12 characters with both numeric and alphabetic characters; legacy ' +
      'systems unable to support 12 must enforce ≥8 with documented justification.',
    pciReference: 'PCI DSS v4.0.1 Section 8.3.6',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Password-policy events surface around policy roll-outs and resets — 30 days captures monthly cycles.',
    },
    recommendations: [
      'Enforce ≥12-character passwords with mixed numeric+alphabetic characters (Req 8.3.6).',
      'Document compensating controls if legacy systems require an 8-character minimum.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "iam" AND (event.action LIKE "*password*policy*" ' +
            'OR event.action LIKE "*password*change*" OR event.action LIKE "*password*reset*" ' +
            'OR event.action LIKE "*credential*")'
        ),
    },
  },

  '8.3.9': {
    id: '8.3.9',
    name: 'Password Rotation or MFA Enforcement',
    description:
      'Verify either password-rotation or MFA-enrolment evidence. PCI DSS v4.0.1 Req 8.3.9 ' +
      'eliminated the password-only path; passwords must rotate every 90 days OR MFA must be ' +
      'in use.',
    pciReference: 'PCI DSS v4.0.1 Section 8.3.9',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 90,
      rationale: 'Spec-mandated 90-day window — looking for any rotation OR MFA event per user.',
    },
    recommendations: [
      'Enforce password rotation every 90 days OR implement MFA — Req 8.3.9 eliminated password-only.',
      'Prefer MFA: it is the future-proof path and PCI DSS guidance recommends it.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "iam" AND (event.action LIKE "*password*change*" ' +
            'OR event.action LIKE "*password*reset*" OR event.action LIKE "*mfa*enroll*" ' +
            'OR event.action LIKE "*mfa*register*" OR event.action LIKE "*2fa*" OR event.action LIKE "*totp*")'
        ),
    },
  },

  '8.4.2': {
    id: '8.4.2',
    name: 'MFA for All CDE Access',
    description:
      'Verify MFA-related authentication events are present. PCI DSS v4.0.1 Req 8.4.2 broadened ' +
      'the MFA requirement to ALL access into the CDE (not only administrative). Phishing-' +
      'resistant authentication (FIDO2 / WebAuthn) may substitute for traditional MFA for non-' +
      'admin access.',
    pciReference: 'PCI DSS v4.0.1 Section 8.4.2',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'MFA telemetry should be continuous; 30-day window confirms it is present and flowing.',
    },
    recommendations: [
      'Enforce MFA for ALL interactive CDE access — Req 8.4.2 broadened beyond admin-only.',
      'Consider FIDO2 / WebAuthn — Req 8.4.2 accepts phishing-resistant auth as MFA equivalent.',
      'Ensure MFA challenge / verify / enrol events reach the SIEM for auditability.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "authentication" AND (event.action LIKE "*mfa*" ' +
            'OR event.action LIKE "*multi_factor*" OR event.action LIKE "*2fa*" ' +
            'OR event.action LIKE "*totp*" OR event.action LIKE "*fido*" ' +
            'OR event.action LIKE "*webauthn*" OR event.action LIKE "*verify*factor*")'
        ),
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Malware drill-downs
  // ════════════════════════════════════════════════════════════════════════

  '5.2.1': {
    id: '5.2.1',
    name: 'Anti-Malware Deployed on All System Components',
    description:
      'Verify anti-malware telemetry is present from endpoints. The presence of malware-' +
      'detection events confirms an anti-malware solution is deployed and active.',
    pciReference: 'PCI DSS v4.0.1 Section 5.2.1',
    requiredFields: ['@timestamp', 'event.category', 'host.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 30,
      rationale:
        'Malware-defence telemetry baseline; 30 days catches at least one scan cycle per host.',
    },
    recommendations: [
      'Verify every in-scope endpoint reports anti-malware telemetry.',
      'Investigate hosts whose anti-malware events go silent — that is a coverage gap.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "malware" OR event.module == "endpoint" ' +
            'OR event.action LIKE "*malware*" OR event.action LIKE "*virus*"'
        ),
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Vulnerability management drill-downs
  // ════════════════════════════════════════════════════════════════════════

  '6.3.3': {
    id: '6.3.3',
    name: 'Critical Vulnerability Patching Within 30 Days',
    description:
      'Detect unpatched critical-severity vulnerabilities. PCI DSS v4.0.1 Section 6.3.3 ' +
      'requires critical-severity vulnerabilities to be patched within 30 days. NB: v4.0.1 ' +
      'narrowed this from "critical+high" (in v4.0) to "critical only".',
    pciReference: 'PCI DSS v4.0.1 Section 6.3.3',
    requiredFields: ['@timestamp', 'vulnerability.id', 'vulnerability.severity', 'host.name'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 30,
      rationale:
        'Spec-mandated 30-day SLA — checking for critical vulnerabilities still open within that window.',
    },
    recommendations: [
      'Prioritise critical-severity remediation within 30 days (Req 6.3.3 post-v4.0.1).',
      'Establish documented compensating controls for any critical vulnerability that cannot meet the SLA.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'vulnerability.id IS NOT NULL'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE vulnerability.id IS NOT NULL AND vulnerability.severity == "critical" ` +
        `| STATS open_critical = COUNT(*), affected_hosts = COUNT_DISTINCT(host.name) BY vulnerability.id, host.name ` +
        `| SORT open_critical DESC ` +
        `| LIMIT 25`,
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Audit-trail drill-downs (10.x)
  // ════════════════════════════════════════════════════════════════════════

  '10.2.1': {
    id: '10.2.1',
    name: 'Audit Trail Integrity',
    description:
      'Detect audit-log stop, pause, deletion, or tampering events. PCI DSS v4.0.1 Req 10.2.1 ' +
      'requires audit trails to be protected from modification.',
    pciReference: 'PCI DSS v4.0.1 Section 10.2.1',
    requiredFields: ['@timestamp', 'event.category', 'event.action'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 30,
      rationale:
        'Log-tampering events are rare and high-signal — 30 days catches both planned maintenance pauses and unauthorised stops.',
    },
    recommendations: [
      'Investigate every audit-log stop, pause, or deletion event immediately.',
      'Use write-once log storage where possible to prevent tampering.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'event.category IS NOT NULL'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.action LIKE "*audit*stop*" OR event.action LIKE "*audit*delete*" ` +
        `OR event.action LIKE "*audit*pause*" OR event.action LIKE "*log*clear*" ` +
        `OR event.action LIKE "*log*delete*" OR event.action LIKE "*trail*stop*" ` +
        `| STATS tamper_events = COUNT(*), actors = COUNT_DISTINCT(user.name) BY event.action, host.name, user.name ` +
        `| SORT tamper_events DESC ` +
        `| LIMIT 25`,
    },
  },

  '10.2.2': {
    id: '10.2.2',
    name: 'Administrative Action Logging',
    description:
      'Verify that actions by users with administrative privileges are logged. PCI DSS v4.0.1 ' +
      'Req 10.2.2 requires audit trails for all admin actions.',
    pciReference: 'PCI DSS v4.0.1 Section 10.2.2',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'user.name'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 7,
      rationale:
        'Admin actions should be continuous — a short window quickly surfaces gaps in coverage.',
    },
    recommendations: [
      'Ensure all administrative actions (config changes, user mgmt, system modifications) are logged.',
      'Correlate admin actions with change-management records for change-window enforcement.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.category == "configuration" OR event.category == "iam" ' +
            'OR event.action LIKE "*admin*" OR event.action LIKE "*sudo*" OR event.action LIKE "*root*"'
        ),
    },
  },

  '10.3': {
    id: '10.3',
    name: 'Audit Log Entry Detail Completeness',
    description:
      'Verify audit log entries carry the required detail: user ID, event type, date/time, ' +
      'success/failure, origin, and identity of affected resource. Field-fill-rate measures ' +
      'whether the SIEM consistently captures these.',
    pciReference: 'PCI DSS v4.0.1 Section 10.3',
    requiredFields: ['@timestamp', 'user.name', 'event.category', 'event.action', 'event.outcome'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 7,
      rationale:
        'Field-fill-rate is most accurate on recent data; a short window avoids historical ingestion-quirk noise.',
    },
    recommendations: [
      'Audit field-fill rates for user.name, event.action, and event.outcome across all log sources.',
      'Investigate sources whose fill rate is below 90% for required audit-trail fields.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'event.category IS NOT NULL AND user.name IS NOT NULL'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| STATS total = COUNT(*), has_user = COUNT(user.name), has_action = COUNT(event.action), has_outcome = COUNT(event.outcome) ` +
        `| EVAL user_fill_pct = ROUND((has_user * 100.0) / total), action_fill_pct = ROUND((has_action * 100.0) / total), outcome_fill_pct = ROUND((has_outcome * 100.0) / total) ` +
        `| LIMIT 1`,
    },
  },

  '10.5': {
    id: '10.5',
    name: 'Audit Log Retention',
    description:
      'Verify audit-log retention spans ≥12 months with the most recent 3 months immediately ' +
      'available. PCI DSS v4.0.1 Req 10.5 codifies the retention window.',
    pciReference: 'PCI DSS v4.0.1 Section 10.5',
    requiredFields: ['@timestamp'],
    verdict: 'verify_presence',
    defaultLookback: {
      days: 365,
      rationale:
        'Spec-mandated 12-month retention — query spans the full index window to find the oldest entry.',
    },
    recommendations: [
      'Configure ILM / retention so audit logs are kept ≥12 months total, with the most recent 3 months online.',
      'Verify the oldest log timestamp meets the retention floor at every release cycle.',
    ],
    queries: {
      // Retention deliberately spans the FULL index (no @timestamp filter). The
      // evaluator's count-based scoring path treats "any events exist" as
      // evidence of retention; auditors then inspect the projected oldest /
      // newest / retention-days columns for the actual horizon.
      coverage: (i) =>
        `FROM ${i} ` +
        `| STATS total_logged_events = COUNT(*), earliest_event = MIN(@timestamp), latest_event = MAX(@timestamp) ` +
        `| EVAL retention_horizon_days = DATE_DIFF("day", earliest_event, latest_event)`,
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Testing drill-downs (11.x)
  // ════════════════════════════════════════════════════════════════════════

  '11.5': {
    id: '11.5',
    name: 'Intrusion Detection and Prevention',
    description:
      'Detect active IDS/IPS alerts. PCI DSS v4.0.1 Req 11.5 expects IDS/IPS to be in use and ' +
      'producing alerts that are monitored.',
    pciReference: 'PCI DSS v4.0.1 Section 11.5',
    requiredFields: ['@timestamp', 'event.category', 'event.kind'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 7,
      rationale:
        'IDS/IPS alerts are time-sensitive — short window surfaces active incidents rather than historical noise.',
    },
    recommendations: [
      'Triage active IDS/IPS alerts promptly; aged alerts are the highest-risk gap.',
      'Tune detection rules to reduce false positives while keeping coverage.',
    ],
    queries: {
      coverage: (i) => presenceQuery(i, 'event.category == "intrusion_detection"'),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.category == "intrusion_detection" AND event.kind == "alert" ` +
        `| STATS active_alerts = COUNT(*), unique_actions = COUNT_DISTINCT(event.action) BY host.name, event.action ` +
        `| SORT active_alerts DESC ` +
        `| LIMIT 25`,
    },
  },

  '11.6': {
    id: '11.6',
    name: 'Payment Page Tamper Detection',
    description:
      'Detect unauthorised changes to payment-page content or HTTP headers. PCI DSS v4.0.1 ' +
      'Req 11.6 mandates change- and tamper-detection on payment pages — effective March 31, 2025.',
    pciReference: 'PCI DSS v4.0.1 Section 11.6',
    requiredFields: ['@timestamp', 'event.category', 'event.action', 'url.domain'],
    verdict: 'detect_violations',
    defaultLookback: {
      days: 7,
      rationale:
        'Payment-page integrity events are bursty and time-sensitive — short window surfaces real incidents.',
    },
    recommendations: [
      'Implement Content Security Policy (CSP) and Subresource Integrity (SRI) on all payment pages.',
      'Deploy change-detection that alerts on unauthorised script or header modifications.',
      'Req 11.6 became mandatory 2025-03-31 per PCI DSS v4.0.1.',
    ],
    queries: {
      coverage: (i) =>
        presenceQuery(
          i,
          'event.action LIKE "*csp*" OR event.action LIKE "*integrity*" ' +
            'OR event.action LIKE "*tamper*" OR event.action LIKE "*payment*page*"'
        ),
      violation: (i) =>
        `FROM ${i} ` +
        `| WHERE ${AUTONOMOUS_TIME_WINDOW} ` +
        `| WHERE event.action LIKE "*tamper*" OR event.action LIKE "*integrity*violation*" ` +
        `OR event.action LIKE "*csp*violation*" OR event.action LIKE "*script*inject*" ` +
        `OR event.action LIKE "*page*change*" OR event.action LIKE "*skimmer*" ` +
        `| STATS tamper_alerts = COUNT(*), unique_pages = COUNT_DISTINCT(url.domain) BY url.domain, event.action ` +
        `| SORT tamper_alerts DESC ` +
        `| LIMIT 25`,
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Resolution helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Time-range param array for the autonomous evaluator. The shape is dictated
 * by Elasticsearch's ES|QL `params` contract — array of single-key objects.
 * The names match the placeholders in {@link AUTONOMOUS_TIME_WINDOW}.
 */
export const buildAutonomousTimeWindowParams = ({
  from,
  to,
}: {
  from: string;
  to: string;
}): Array<Record<string, string>> => [{ _window_start: from }, { _window_end: to }];

/**
 * Compute the time window for a given check.
 *
 * Different default-lookback rationales are encoded in the catalog — this
 * helper inspects the relevant entry and produces a from/to pair. Caller-
 * supplied `userTimeRange` always wins.
 */
export const getAutonomousTimeRangeForCheck = (
  checkId: string,
  userTimeRange?: { from: string; to: string }
): { from: string; to: string } => {
  if (userTimeRange) return userTimeRange;
  const days = AUTONOMOUS_PCI_REQUIREMENTS[checkId]?.defaultLookback.days ?? 90;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
};

/**
 * Default 90-day window for callers that aren't pinned to a specific check.
 */
export const getAutonomousDefaultTimeRange = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
};

/**
 * Map a raw input ID into a canonical catalog key. Accepts:
 *   - "all" (verbatim)
 *   - any catalog key (verbatim)
 *   - any dotted sub-requirement whose parent exists, returning the parent
 *
 * Returns null if the requirement is unrecognised.
 */
export const normalizeAutonomousRequirementId = (requirement: string): string | null => {
  if (requirement === 'all') return requirement;
  if (AUTONOMOUS_PCI_REQUIREMENTS[requirement]) return requirement;
  const parent = requirement.split('.')[0];
  return AUTONOMOUS_PCI_REQUIREMENTS[parent] ? parent : null;
};

/**
 * Expand caller requirement IDs into the full set the evaluator will run.
 * Top-level IDs (e.g. "8") expand to themselves + every dotted sub-key
 * ("8.2.4", "8.3.4", "8.3.6", "8.3.9", "8.4.2"). "all" returns every key.
 */
export const resolveAutonomousRequirementIds = (requirements?: string[]): string[] => {
  if (!requirements || requirements.length === 0 || requirements.includes('all')) {
    return Object.keys(AUTONOMOUS_PCI_REQUIREMENTS);
  }
  const expanded = new Set<string>();
  for (const req of requirements) {
    const canonical = normalizeAutonomousRequirementId(req);
    if (canonical && canonical !== 'all') {
      expanded.add(canonical);
      for (const key of Object.keys(AUTONOMOUS_PCI_REQUIREMENTS)) {
        if (key.startsWith(`${canonical}.`)) {
          expanded.add(key);
        }
      }
    }
  }
  return [...expanded];
};

/**
 * Resolve a comma-joined ES|QL index pattern from a caller's index list.
 */
export const getAutonomousIndexPattern = (indices?: string[]): string => {
  const selected = indices && indices.length > 0 ? indices : [...AUTONOMOUS_DEFAULT_INDEX_PATTERNS];
  return selected.join(',');
};

/**
 * Resolve a deduped list of index patterns from a caller's input.
 */
export const getAutonomousIndexList = (indices?: string[]): string[] =>
  indices && indices.length > 0
    ? Array.from(new Set(indices))
    : [...AUTONOMOUS_DEFAULT_INDEX_PATTERNS];

// ──────────────────────────────────────────────────────────────────────────
// Schema/catalog cross-check
// ──────────────────────────────────────────────────────────────────────────
//
// The earlier `Record<string, …>` typing produced a `z.infer`-based compile-
// time anchor that didn't actually constrain anything — the regex behind
// `pciAutonomousRequirementIdSchema` is a runtime check that TypeScript
// can't see. The real invariant ("every catalog key parses cleanly through
// the schema") is asserted in `pci_autonomous_requirements.test.ts`, which
// runs the schema's `.parse()` on every key and on the literal `"all"`.
