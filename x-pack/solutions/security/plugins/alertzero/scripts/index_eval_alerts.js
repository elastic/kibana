#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Index the 8 hand-labelled synthetic eval alerts into .alerts-security.alerts-default.
 *
 * Fresh UUIDs are generated on every run so the workflow's already_analyzed tag gate never
 * suppresses a repeat run. Alert IDs are printed at the end — use them in the Worker trigger curl.
 *
 * Usage:
 *   node index_eval_alerts.js [options]
 *
 *   --es      Elasticsearch base URL (default: http://localhost:9200)
 *   --kibana  Kibana base URL (default: http://localhost:5601)
 *   --space   Kibana space id (default: default)
 *   --run     After indexing, trigger the Worker immediately (no curl needed)
 *   --clean   Delete all previously indexed eval alerts instead of creating new ones
 */

const { randomUUID } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const ES_URL = flag('--es', 'http://localhost:9200');
const KB_URL = flag('--kibana', 'http://localhost:5601');
const SPACE = flag('--space', 'default');
const CLEAN = args.includes('--clean');
const RUN = args.includes('--run');
const INDEX = `.alerts-security.alerts-${SPACE}`;
const AUTH = 'elastic:changeme';

// Workers install lazily per space under `${workerId}-${spaceId}`, so the run route needs the
// space-suffixed id. The bare registered id 404s even once the Worker is installed and enabled.
const WORKER_ID = `system-security-floor-alert-triage-${SPACE}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function esRequest(method, path, body) {
  const url = `${ES_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(AUTH).toString('base64'),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const ts = (offsetMinutes) => {
  const d = new Date('2024-06-15T09:00:00Z');
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

// Minimum noise envelope: enough for the allow-list pick filter to have something to strip,
// without the full 200-field real-alert payload.
const noise = (id, timestamp) => ({
  agent: { id: `agent-${id}`, type: 'endpoint', version: '8.19.0' },
  'data_stream.dataset': 'endpoint.alerts',
  'data_stream.namespace': 'default',
  'data_stream.type': 'logs',
  'ecs.version': '8.11.0',
  'host.id': `host-${id}`,
  'host.architecture': 'x86_64',
  'host.os.name': 'Windows',
  'host.os.family': 'windows',
  'host.os.type': 'windows',
  'event.module': 'endpoint',
  'event.dataset': 'endpoint.alerts',
  'event.created': timestamp,
  'event.ingested': timestamp,
  'kibana.alert.depth': 1,
  'kibana.alert.ancestors': [
    { depth: 0, index: '.ds-logs-endpoint.alerts-default', id: `${id}-anc`, type: 'event' },
  ],
  'kibana.alert.original_time': timestamp,
  'kibana.alert.last_detected': timestamp,
  'kibana.alert.start': timestamp,
  'kibana.alert.space_ids': ['default'],
  'kibana.alert.workflow_assignee_ids': [],
  'kibana.alert.rule.author': [],
  'kibana.alert.rule.enabled': true,
  'kibana.alert.rule.from': 'now-3660s',
  'kibana.alert.rule.interval': '1h',
  'kibana.alert.rule.indices': ['logs-endpoint.alerts-*'],
  'kibana.alert.rule.exceptions_list': [],
  'kibana.alert.rule.tags': [],
  'kibana.alert.rule.execution.uuid': `${id}-exec`,
  'kibana.alert.rule.parameters': { type: 'query', language: 'kuery', query: '*' },
  'kibana.version': '8.19.0',
});

// Build a full alert doc. `id` is the UUID prefix for this alert on this run.
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
}) => {
  const timestamp = ts(index);
  return {
    ...noise(id, timestamp),
    '@timestamp': timestamp,
    // Required by preprocessAlertInputs to build the trigger event:
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.alert.rule.type': 'query',
    'kibana.alert.rule.name': ruleName,
    'kibana.alert.rule.description': ruleDescription,
    'kibana.alert.rule.severity': severity,
    'kibana.alert.rule.risk_score': riskScore,
    'kibana.alert.rule.uuid': `${id}-rule`,
    'kibana.alert.rule.rule_id': `${id}-rule`,
    'kibana.alert.rule.threat': [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: tactic.id, name: tactic.name, reference: '' },
        technique: [{ id: technique.id, name: technique.name, reference: '' }],
      },
    ],
    'kibana.alert.uuid': id,
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.status': 'active',
    'kibana.alert.severity': severity,
    'kibana.alert.risk_score': riskScore,
    'kibana.alert.reason': `${ruleName} triggered`,
    // Observable (classification signal):
    ...observable,
  };
};

// ── Alert definitions (extracted from synthetic_alerts.ts) ────────────────────
// Labels: TP = true_positive, FP = false_positive

const ALERT_TEMPLATES = [
  // ── Tier 1: automated malware detection → true_positive ────────────────────
  {
    label: 'tier1-ransomware',
    expected: 'true_positive',
    ruleName: 'Ransomware Prevention Alert',
    ruleDescription:
      'Elastic Defend detected behavior consistent with ransomware file encryption on the endpoint.',
    severity: 'critical',
    riskScore: 99,
    index: 0,
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
  },
  {
    label: 'tier1-malicious-file',
    expected: 'true_positive',
    ruleName: 'Malware Detection Alert',
    ruleDescription:
      'Elastic Defend identified a file matching a known-malicious signature on the endpoint.',
    severity: 'critical',
    riskScore: 99,
    index: 1,
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
  },
  // ── Tier 2: high-precision behavioral + unsigned process → true_positive ───
  {
    label: 'tier2-lsass',
    expected: 'true_positive',
    ruleName: 'Malicious Behavior Detection Alert: Credential Access via LSASS Memory',
    ruleDescription:
      'Elastic Defend behavioral engine detected access to LSASS process memory, consistent with credential dumping.',
    severity: 'high',
    riskScore: 73,
    index: 2,
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
  },
  {
    label: 'tier2-shellcode',
    expected: 'true_positive',
    ruleName: 'Malicious Behavior Detection Alert: Shellcode Injection via Memory',
    ruleDescription:
      'Elastic Defend behavioral engine detected shellcode injection into a remote process.',
    severity: 'high',
    riskScore: 78,
    index: 3,
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
  },
  // ── Tier 3: behavioral + signed vendor process → false_positive ────────────
  {
    label: 'tier3-wmi',
    expected: 'false_positive',
    ruleName: 'Malicious Behavior Detection Alert: Suspicious WMI Execution',
    ruleDescription:
      'Elastic Defend behavioral engine detected WMI process execution, which can be used for remote execution.',
    severity: 'medium',
    riskScore: 47,
    index: 4,
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
  },
  {
    label: 'tier3-startup',
    expected: 'false_positive',
    ruleName: 'Malicious Behavior Detection Alert: Startup Folder Persistence',
    ruleDescription:
      'Elastic Defend behavioral engine detected a new autostart entry in the Startup folder.',
    severity: 'medium',
    riskScore: 43,
    index: 5,
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
  },
  // ── Tier 4: generic / threshold rule, benign signed process → false_positive
  {
    label: 'tier4-threshold',
    expected: 'false_positive',
    ruleName: 'High Volume of Process Executions',
    ruleDescription:
      'Threshold rule that fires when a host exceeds a baseline number of process executions.',
    severity: 'low',
    riskScore: 21,
    index: 6,
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
  },
  {
    label: 'tier4-scheduled-task',
    expected: 'false_positive',
    ruleName: 'Scheduled Task Created',
    ruleDescription: 'Detects creation of a new Windows scheduled task.',
    severity: 'low',
    riskScore: 18,
    index: 7,
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
  },
];

// ── Clean mode ────────────────────────────────────────────────────────────────

async function clean() {
  console.log(`Deleting all eval alerts from ${INDEX} (tag: eval-fixture)…`);
  const result = await esRequest('POST', `/${INDEX}/_delete_by_query`, {
    query: { term: { 'kibana.alert.rule.tags': 'eval-fixture' } },
  });
  console.log(`Deleted ${result.deleted} document(s).`);
}

// ── Index mode ────────────────────────────────────────────────────────────────

async function indexAlerts() {
  // Use a single run prefix so all 8 alerts share a run id — easier to grep
  const runId = randomUUID().slice(0, 8);
  const indexed = [];

  for (const tmpl of ALERT_TEMPLATES) {
    const id = `eval-${runId}-${tmpl.label}`;
    const doc = buildDoc({ ...tmpl, id });
    // Tag for easy cleanup
    doc['kibana.alert.rule.tags'] = ['eval-fixture'];

    await esRequest('PUT', `/${INDEX}/_doc/${id}`, doc);
    indexed.push({ id, label: tmpl.label, expected: tmpl.expected });
    process.stdout.write(`  ✓ ${id}  (expected: ${tmpl.expected})\n`);
  }

  console.log(`\nIndexed ${indexed.length} alerts with run prefix: ${runId}`);

  const payload = {
    inputs: {
      event: {
        triggerType: 'alert',
        alertIds: indexed.map(({ id }) => ({ _id: id, _index: INDEX })),
      },
    },
  };

  // Write payload to a temp file — avoids multiline -d quoting issues on paste
  const payloadFile = path.join(os.tmpdir(), 'alert-triage-payload.json');
  fs.writeFileSync(payloadFile, JSON.stringify(payload, null, 2));

  // The workflow UI's Run dialog wraps whatever it is given under `inputs` itself, so
  // pasting the API body above produces inputs.inputs.event. Alert preprocessing reads
  // inputs.event, so it silently skips, event.alerts is never built, and attach_alerts
  // fails with "expected array to have >=1 items". Write the unwrapped form separately.
  const uiPayloadFile = path.join(os.tmpdir(), 'alert-triage-payload-ui.json');
  fs.writeFileSync(uiPayloadFile, JSON.stringify(payload.inputs, null, 2));

  console.log('\n── Worker trigger ───────────────────────────────────────────────────────');

  if (RUN) {
    // Trigger directly via Node fetch — no curl, no quoting issues
    console.log('Triggering Worker run via Kibana API…');
    const runRes = await fetch(`${KB_URL}/api/workflows/workflow/${WORKER_ID}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
        Authorization: 'Basic ' + Buffer.from(AUTH).toString('base64'),
      },
      body: JSON.stringify(payload),
    });
    const runJson = await runRes.json();
    if (!runRes.ok) throw new Error(`Run API ${runRes.status}: ${JSON.stringify(runJson)}`);
    const execId = runJson.workflowExecutionId;
    console.log(`  ✓ Execution started: ${execId}`);
    console.log(`  Watch live: ${KB_URL}/app/workflows/executions/${execId}`);
    console.log(`\n  Poll for result:`);
    console.log(
      `  curl -u elastic:changeme '${KB_URL}/api/workflows/executions/${execId}' -H 'elastic-api-version: 2023-10-31'`
    );
  } else {
    // Print a curl that reads from the temp file — reliable across terminal widths
    console.log(`API body written to:   ${payloadFile}`);
    console.log(`UI Run body written to: ${uiPayloadFile}`);
    console.log(`\ncurl -u elastic:changeme -XPOST \\`);
    console.log(`  '${KB_URL}/api/workflows/workflow/${WORKER_ID}/run' \\`);
    console.log(`  -H 'kbn-xsrf: true' \\`);
    console.log(`  -H 'elastic-api-version: 2023-10-31' \\`);
    console.log(`  -H 'content-type: application/json' \\`);
    console.log(`  --data-binary @${payloadFile}`);
    console.log(`\n  Or trigger and watch in one go:`);
    console.log(`  node ${path.resolve(__filename)} --run`);
    console.log(`\n  Running from the workflow UI instead? Paste ${uiPayloadFile}`);
    console.log(`  (the dialog adds the "inputs" wrapper itself — pasting the API body`);
    console.log(`   double-nests it, alert preprocessing skips, and attach_alerts fails).`);
  }

  console.log(`\n── FP alerts (tier 3 + 4, expected to be proposed for close) ───────────`);
  indexed.filter((a) => a.expected === 'false_positive').forEach((a) => console.log(`  ${a.id}`));
  console.log(`\n── TP alerts (tier 1 + 2, should be tagged but not closed) ─────────────`);
  indexed.filter((a) => a.expected === 'true_positive').forEach((a) => console.log(`  ${a.id}`));
  console.log(`\nCleanup: node index_eval_alerts.js --clean`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`Target index: ${INDEX}  (ES: ${ES_URL}, Kibana: ${KB_URL})\n`);
  if (CLEAN) {
    await clean();
  } else {
    await indexAlerts();
  }
})().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
