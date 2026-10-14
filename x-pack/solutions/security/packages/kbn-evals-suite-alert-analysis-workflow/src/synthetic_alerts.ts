/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Labeled synthetic alerts for the alert-analysis managed workflow eval.
 *
 * For each eval example the spec indexes a fresh copy of the alert (with a per-run unique alert
 * and rule uuid) into `.alerts-security.alerts-default`, runs the real workflow end-to-end, then
 * deletes it. The workflow's `ai.agent` step classifies the alert true_positive / false_positive,
 * and we grade that verdict against `expected`.
 *
 * The dataset exercises the four confidence tiers the workflow prompt reasons over
 * (see the `<alert_confidence_tier>` and `<reasoning_process>` sections of
 * alert_analysis_workflow.yaml):
 *
 *   - Tier 1 (event.code = ransomware / malicious_file) → true_positive (Gate A)
 *   - Tier 2 (behavior, high-precision technique + unsigned process) → true_positive (Gate C/E)
 *   - Tier 3 (behavior, technique with legitimate uses, signed vendor process) → false_positive (Gate D)
 *   - Tier 4 (generic/threshold rule, benign signed process) → false_positive (Gate D)
 *
 * Each alert carries a base rule uuid here, but the spec overrides it with a per-run unique uuid
 * before indexing (see the task in the spec). That is what guarantees the workflow's per-rule
 * enrichment queries (prevalence, close history, rule metadata) resolve to just the single seeded
 * alert even when repetitions run concurrently — the verdict is driven by the alert's own
 * observable fields, which is what this suite measures.
 *
 * Fields are stored as flattened (dotted) keys, matching how detection alerts are indexed;
 * the run route's `preprocessAlertInputs` expands them before the agent sees them. The rule
 * identity fields (`consumer`, `producer`, `rule_type_id`) are required for
 * `preprocessAlertInputs` to build the trigger event.
 *
 * Realistic noise (see `buildNoiseEnvelope`): every alert is padded with the bulky, low-signal
 * ECS + alert-framework fields a real Elastic Defend / SIEM alert carries (agent, ecs, host.os,
 * process lineage/binary metadata, `kibana.alert.*` internals, `Endpoint`/`Events`/`Responses`,
 * rule config, etc.). This exists so the suite can meaningfully validate changes that narrow the
 * alert `_source` sent to the model — e.g. the `pick` filter in
 * https://github.com/elastic/kibana/pull/277085. Without the noise, a field allow-list would have
 * nothing to strip and the before/after comparison would be a no-op. The noise is deliberately
 * limited to fields that the workflow's `build_alert_observable_context` step does NOT read, so it
 * only bloats the attachment `_source` (what `pick` trims) and never changes the reasoning message
 * the model classifies on — keeping the golden labels valid.
 */

import type { Classification } from './constants';

export interface LabeledAlert {
  id: string;
  /** Golden verdict the workflow's classification is graded against. */
  expected: Classification;
  /** Short human-readable summary of why this label is expected (dataset description). */
  description: string;
  doc: Record<string, unknown>;
}

const BASE_TIMESTAMP = new Date('2024-06-15T09:00:00Z');

const ts = (offsetMinutes: number): string => {
  const d = new Date(BASE_TIMESTAMP);
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

interface BuildAlertParams {
  id: string;
  index: number;
  ruleName: string;
  ruleDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  tactic: { id: string; name: string };
  technique: { id: string; name: string };
  observable: Record<string, unknown>;
}

/**
 * Bulky, low-signal fields a real Elastic Defend / SIEM alert `_source` carries, modeled on an
 * actual endpoint alert. Every field here is attachment-only noise: none is read by the workflow's
 * `build_alert_observable_context` step, so padding with it bloats the raw `_source` (which the
 * `pick` allow-list is meant to trim) without altering the model's reasoning message. Values are
 * partly derived from `id` so the noise looks per-alert-authentic rather than obviously constant.
 */
const buildNoiseEnvelope = (id: string, timestamp: string): Record<string, unknown> => ({
  // Agent / data stream / ECS / elastic provenance
  agent: {
    id: `agent-${id}`,
    type: 'endpoint',
    version: '8.19.0',
    build: { original: 'version: 8.19.0, compiled: Tue Jan 3 00:00:00 2023, branch: 8.19' },
  },
  'data_stream.dataset': 'endpoint.alerts',
  'data_stream.namespace': 'default',
  'data_stream.type': 'logs',
  'ecs.version': '8.11.0',
  'elastic.agent.id': `agent-${id}`,

  // Host padding (host.name / host.hostname are per-alert signal, so excluded here)
  'host.id': `host-${id}`,
  'host.architecture': 'x86_64',
  'host.os.name': 'Windows',
  'host.os.family': 'windows',
  'host.os.type': 'windows',
  'host.os.kernel': '21H2 (10.0.20348.1366)',
  'host.os.version': '21H2 (10.0.20348.1366)',
  'host.os.platform': 'windows',
  'host.os.full': 'Windows Server 2022 Datacenter 21H2 (10.0.20348.1366)',
  'host.ip': ['172.31.5.24', 'fe80::ea43:a574:e9a5:ba47', '127.0.0.1', '::1'],
  'host.mac': ['02:09:70:09:67:67'],

  // Event provenance (event.code/category/type/outcome are per-alert signal; these are not read
  // by the observable-context step)
  'event.module': 'endpoint',
  'event.dataset': 'endpoint.alerts',
  'event.agent_id_status': 'verified',
  'event.sequence': 50079,
  'event.id': `${id}-event`,
  'event.created': timestamp,
  'event.ingested': timestamp,
  'event.risk_score': 99,

  // Process lineage / binary metadata (observable-context reads name/executable/command_line/
  // code_signature/parent only; the rest is noise, though a few survive the allow-list on purpose)
  'process.entity_id': `entity-${id}`,
  'process.pid': 6789,
  'process.args_count': 3,
  'process.working_directory': 'C:\\Windows\\system32',
  'process.hash.md5': '266aedbec51e35277729294996a213dd',
  'process.hash.sha1': '855a676f3018e78a37a9fb4aaa159584ec21c85c',
  'process.hash.sha256': '9f68f5fc21270a06bb934b5f3fa5aee2068a56a1260d4e7e4b48f2dca501b8c9',
  'process.pe.imphash': '939d090d03567fad6f1ac6f2c641a4b2',
  'process.pe.original_file_name': 'HOSTPROC.EXE',
  'process.Ext': { ancestry: [`entity-${id}-p1`, `entity-${id}-p2`] },

  // Alert-framework internals
  'kibana.alert.depth': 1,
  'kibana.alert.ancestors': [
    { depth: 0, index: '.ds-logs-endpoint.alerts-default', id: `${id}-anc`, type: 'event' },
  ],
  'kibana.alert.original_time': timestamp,
  'kibana.alert.intended_timestamp': timestamp,
  'kibana.alert.last_detected': timestamp,
  'kibana.alert.start': timestamp,
  'kibana.alert.original_event.action': 'rule_detection',
  'kibana.alert.original_event.category': ['malware'],
  'kibana.alert.original_event.dataset': 'endpoint.alerts',
  'kibana.alert.original_event.id': `${id}-oe`,
  'kibana.alert.original_event.kind': 'alert',
  'kibana.alert.original_event.module': 'endpoint',
  'kibana.alert.original_data_stream.dataset': 'endpoint.alerts',
  'kibana.alert.original_data_stream.namespace': 'default',
  'kibana.alert.original_data_stream.type': 'logs',
  'kibana.space_ids': ['default'],
  'kibana.version': '8.19.0',
  'kibana.alert.workflow_assignee_ids': [],

  // Rule configuration internals
  'kibana.alert.rule.author': [],
  'kibana.alert.rule.created_at': '2024-01-01T00:00:00.000Z',
  'kibana.alert.rule.created_by': 'elastic',
  'kibana.alert.rule.updated_at': '2024-01-01T00:00:00.000Z',
  'kibana.alert.rule.updated_by': 'elastic',
  'kibana.alert.rule.enabled': true,
  'kibana.alert.rule.from': 'now-3660s',
  'kibana.alert.rule.to': 'now',
  'kibana.alert.rule.interval': '1h',
  'kibana.alert.rule.immutable': false,
  'kibana.alert.rule.max_signals': 100,
  'kibana.alert.rule.revision': 0,
  'kibana.alert.rule.version': 1,
  'kibana.alert.rule.indices': ['logs-endpoint.alerts-*'],
  'kibana.alert.rule.exceptions_list': [],
  'kibana.alert.rule.false_positives': [],
  'kibana.alert.rule.risk_score_mapping': [],
  'kibana.alert.rule.severity_mapping': [],
  'kibana.alert.rule.tags': [],
  'kibana.alert.rule.execution.uuid': `${id}-exec`,
  'kibana.alert.rule.parameters': {
    description: 'synthetic',
    risk_score: 99,
    severity: 'high',
    type: 'query',
    language: 'kuery',
    query: '*',
    index: ['logs-endpoint.alerts-*'],
  },

  // Bulky endpoint payload objects (dropped entirely by the allow-list)
  Endpoint: {
    policy: { applied: { id: `policy-${id}`, status: 'success', name: 'Default' } },
    capabilities: ['isolation'],
    state: { isolation: false },
  },
  Events: [{ '@timestamp': timestamp, event: { kind: 'event', category: ['process'] } }],
  Responses: [{ '@timestamp': timestamp, action: { field: ['process'] }, result: 0 }],
});

// Rule identity shared by every synthetic alert. `rule_type_id`/`consumer`/`producer` mirror a
// SIEM query rule so the run route resolves a registered rule type when building the event. The
// noise envelope is spread first so the per-alert signal fields below always win on any overlap.
const buildDoc = ({
  id,
  index,
  ruleName,
  ruleDescription,
  severity,
  riskScore,
  tactic,
  technique,
  observable,
}: BuildAlertParams): Record<string, unknown> => ({
  ...buildNoiseEnvelope(id, ts(index)),
  '@timestamp': ts(index),
  'kibana.alert.uuid': id,
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.status': 'active',
  'kibana.alert.severity': severity,
  'kibana.alert.risk_score': riskScore,
  'kibana.alert.reason': `${ruleName} triggered`,
  'kibana.alert.rule.uuid': `${id}-rule`,
  'kibana.alert.rule.rule_id': `${id}-rule`,
  'kibana.alert.rule.name': ruleName,
  'kibana.alert.rule.description': ruleDescription,
  'kibana.alert.rule.category': 'Custom Query Rule',
  'kibana.alert.rule.type': 'query',
  'kibana.alert.rule.consumer': 'siem',
  'kibana.alert.rule.producer': 'siem',
  'kibana.alert.rule.rule_type_id': 'siem.queryRule',
  'kibana.alert.rule.severity': severity,
  'kibana.alert.rule.risk_score': riskScore,
  'kibana.alert.rule.threat': [
    {
      framework: 'MITRE ATT&CK',
      tactic: { id: tactic.id, name: tactic.name, reference: '' },
      technique: [{ id: technique.id, name: technique.name, reference: '' }],
    },
  ],
  ...observable,
});

// ── Tier 1: automated malware / ransomware detection → true_positive (Gate A) ─────────────

const RANSOMWARE: LabeledAlert = {
  id: 'aa-eval-tier1-ransomware',
  expected: 'true_positive',
  description:
    'Tier 1 — Elastic Defend ransomware engine (event.code=ransomware) fired on an unsigned ' +
    'process encrypting files. Gate A: classify true_positive absent a concrete benign explanation.',
  doc: buildDoc({
    id: 'aa-eval-tier1-ransomware',
    index: 0,
    ruleName: 'Ransomware Prevention Alert',
    ruleDescription:
      'Elastic Defend detected behavior consistent with ransomware file encryption on the endpoint.',
    severity: 'critical',
    riskScore: 99,
    tactic: { id: 'TA0040', name: 'Impact' },
    technique: { id: 'T1486', name: 'Data Encrypted for Impact' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['malware', 'file'],
      'event.type': ['denied', 'creation'],
      'event.code': 'ransomware',
      'event.outcome': 'success',
      'host.name': 'ws-finance-04',
      'user.name': 'jsmith',
      'process.name': 'a7f3c1.exe',
      'process.executable': 'C:\\Users\\jsmith\\AppData\\Local\\Temp\\a7f3c1.exe',
      'process.command_line': 'a7f3c1.exe -enc -all',
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'file.name': 'invoice_2024.docx.locked',
      'file.path': 'C:\\Users\\jsmith\\Documents\\invoice_2024.docx.locked',
    },
  }),
};

const MALICIOUS_FILE: LabeledAlert = {
  id: 'aa-eval-tier1-malicious-file',
  expected: 'true_positive',
  description:
    'Tier 1 — Elastic Defend malware engine (event.code=malicious_file) matched a known-bad ' +
    'unsigned executable dropped in a temp path. Gate A: true_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier1-malicious-file',
    index: 1,
    ruleName: 'Malware Detection Alert',
    ruleDescription:
      'Elastic Defend identified a file matching a known-malicious signature on the endpoint.',
    severity: 'critical',
    riskScore: 99,
    tactic: { id: 'TA0002', name: 'Execution' },
    technique: { id: 'T1204', name: 'User Execution' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['malware', 'file'],
      'event.type': ['denied'],
      'event.code': 'malicious_file',
      'event.outcome': 'success',
      'host.name': 'ws-sales-11',
      'user.name': 'bwilson',
      'process.name': 'update_flash.exe',
      'process.executable': 'C:\\Users\\bwilson\\Downloads\\update_flash.exe',
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'file.name': 'update_flash.exe',
      'file.path': 'C:\\Users\\bwilson\\Downloads\\update_flash.exe',
      'file.hash.sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  }),
};

// ── Tier 2: high-precision behavioral technique + unsigned process → true_positive ─────────

const LSASS_ACCESS: LabeledAlert = {
  id: 'aa-eval-tier2-lsass',
  expected: 'true_positive',
  description:
    'Tier 2 — "Malicious Behavior Detection Alert: Credential Access via LSASS Memory" with an ' +
    'unsigned rundll32 reading lsass. Gate C: malicious observable evidence → true_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier2-lsass',
    index: 2,
    ruleName: 'Malicious Behavior Detection Alert: Credential Access via LSASS Memory',
    ruleDescription:
      'Elastic Defend behavioral engine detected access to LSASS process memory, consistent with credential dumping.',
    severity: 'high',
    riskScore: 73,
    tactic: { id: 'TA0006', name: 'Credential Access' },
    technique: { id: 'T1003', name: 'OS Credential Dumping' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': 'dc-01',
      'user.name': 'svc-backup',
      'process.name': 'rundll32.exe',
      'process.executable': 'C:\\Windows\\System32\\rundll32.exe',
      'process.command_line':
        'rundll32.exe C:\\ProgramData\\comsvcs.dll, MiniDump 624 C:\\ProgramData\\lsass.dmp full',
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'process.parent.name': 'cmd.exe',
      'process.parent.executable': 'C:\\Windows\\System32\\cmd.exe',
    },
  }),
};

const MEMORY_INJECTION: LabeledAlert = {
  id: 'aa-eval-tier2-shellcode',
  expected: 'true_positive',
  description:
    'Tier 2 — "Malicious Behavior Detection Alert: Shellcode Injection" with an unsigned process ' +
    'injecting into a remote process. High-precision technique + no benign explanation → true_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier2-shellcode',
    index: 3,
    ruleName: 'Malicious Behavior Detection Alert: Shellcode Injection via Memory',
    ruleDescription:
      'Elastic Defend behavioral engine detected shellcode injection into a remote process, consistent with memory injection.',
    severity: 'high',
    riskScore: 78,
    tactic: { id: 'TA0005', name: 'Defense Evasion' },
    technique: { id: 'T1055', name: 'Process Injection' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': 'ws-dev-07',
      'user.name': 'mchen',
      'process.name': 'svchost.exe',
      'process.executable': 'C:\\Users\\mchen\\AppData\\Roaming\\svchost.exe',
      'process.command_line': 'svchost.exe',
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'process.parent.name': 'winword.exe',
      'process.parent.executable':
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\winword.exe',
    },
  }),
};

// ── Tier 3: behavioral technique with legitimate uses, signed vendor process → false_positive

const WMI_ADMIN: LabeledAlert = {
  id: 'aa-eval-tier3-wmi',
  expected: 'false_positive',
  description:
    'Tier 3 — "Malicious Behavior Detection Alert: Suspicious WMI Execution" but the process is ' +
    'Microsoft-signed and the command line is a routine inventory query. Gate D → false_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier3-wmi',
    index: 4,
    ruleName: 'Malicious Behavior Detection Alert: Suspicious WMI Execution',
    ruleDescription:
      'Elastic Defend behavioral engine detected WMI process execution, which can be used for remote execution.',
    severity: 'medium',
    riskScore: 47,
    tactic: { id: 'TA0002', name: 'Execution' },
    technique: { id: 'T1047', name: 'Windows Management Instrumentation' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': 'ws-it-02',
      'user.name': 'admin-tluna',
      'process.name': 'WmiPrvSE.exe',
      'process.executable': 'C:\\Windows\\System32\\wbem\\WmiPrvSE.exe',
      'process.command_line':
        'wmic /namespace:\\\\root\\cimv2 path win32_operatingsystem get caption',
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': 'Microsoft Windows',
      'process.parent.name': 'sccm-inventory.exe',
      'process.parent.code_signature.trusted': true,
      'process.parent.code_signature.subject_name': 'Microsoft Corporation',
    },
  }),
};

const STARTUP_PERSISTENCE: LabeledAlert = {
  id: 'aa-eval-tier3-startup',
  expected: 'false_positive',
  description:
    'Tier 3 — "Malicious Behavior Detection Alert: Startup Folder Persistence" from a signed ' +
    'vendor installer writing its own auto-start entry. Routine install pattern → false_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier3-startup',
    index: 5,
    ruleName: 'Malicious Behavior Detection Alert: Startup Folder Persistence',
    ruleDescription:
      'Elastic Defend behavioral engine detected a new autostart entry in the Startup folder.',
    severity: 'medium',
    riskScore: 43,
    tactic: { id: 'TA0003', name: 'Persistence' },
    technique: { id: 'T1547', name: 'Boot or Logon Autostart Execution' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['file'],
      'event.type': ['creation'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': 'ws-design-09',
      'user.name': 'kpatel',
      'process.name': 'Acrobat_Setup.exe',
      'process.executable': 'C:\\Program Files\\Adobe\\Acrobat\\Setup\\Acrobat_Setup.exe',
      'process.command_line': 'Acrobat_Setup.exe /sAll /rs',
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': 'Adobe Inc.',
      'file.name': 'Adobe Updater.lnk',
      'file.path':
        'C:\\Users\\kpatel\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Adobe Updater.lnk',
    },
  }),
};

// ── Tier 4: generic / threshold rule, benign signed process → false_positive ───────────────

const GENERIC_THRESHOLD: LabeledAlert = {
  id: 'aa-eval-tier4-threshold',
  expected: 'false_positive',
  description:
    'Tier 4 — generic threshold rule with no Elastic Defend prefix firing on a Microsoft-signed ' +
    'system process doing routine work, no anomaly. Gate D → false_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier4-threshold',
    index: 6,
    ruleName: 'High Volume of Process Executions',
    ruleDescription:
      'Threshold rule that fires when a host exceeds a baseline number of process executions in a window.',
    severity: 'low',
    riskScore: 21,
    tactic: { id: 'TA0002', name: 'Execution' },
    technique: { id: 'T1059', name: 'Command and Scripting Interpreter' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.outcome': 'success',
      'host.name': 'build-agent-03',
      'user.name': 'ci-runner',
      'process.name': 'msbuild.exe',
      'process.executable':
        'C:\\Program Files\\Microsoft Visual Studio\\2022\\MSBuild\\msbuild.exe',
      'process.command_line': 'msbuild.exe solution.sln /t:Build /p:Configuration=Release',
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': 'Microsoft Corporation',
    },
  }),
};

const SCHEDULED_TASK: LabeledAlert = {
  id: 'aa-eval-tier4-scheduled-task',
  expected: 'false_positive',
  description:
    'Tier 4 — generic "Scheduled Task Created" rule firing on a signed Windows service creating a ' +
    'routine maintenance task. No positive anomaly evidence → false_positive.',
  doc: buildDoc({
    id: 'aa-eval-tier4-scheduled-task',
    index: 7,
    ruleName: 'Scheduled Task Created',
    ruleDescription: 'Detects creation of a new Windows scheduled task.',
    severity: 'low',
    riskScore: 18,
    tactic: { id: 'TA0003', name: 'Persistence' },
    technique: { id: 'T1053', name: 'Scheduled Task/Job' },
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.outcome': 'success',
      'host.name': 'file-server-01',
      'user.name': 'SYSTEM',
      'process.name': 'schtasks.exe',
      'process.executable': 'C:\\Windows\\System32\\schtasks.exe',
      'process.command_line':
        'schtasks /create /tn "Microsoft\\Windows\\Defrag\\ScheduledDefrag" /tr defrag.exe /sc weekly',
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': 'Microsoft Windows',
      'process.parent.name': 'svchost.exe',
      'process.parent.code_signature.trusted': true,
      'process.parent.code_signature.subject_name': 'Microsoft Windows',
    },
  }),
};

export const ALERT_ANALYSIS_EVAL_ALERTS: LabeledAlert[] = [
  RANSOMWARE,
  MALICIOUS_FILE,
  LSASS_ACCESS,
  MEMORY_INJECTION,
  WMI_ADMIN,
  STARTUP_PERSISTENCE,
  GENERIC_THRESHOLD,
  SCHEDULED_TASK,
];
