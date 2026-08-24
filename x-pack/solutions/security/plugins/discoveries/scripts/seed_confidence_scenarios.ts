/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Seed synthetic Elastic Security detection alerts for evaluating Attack
 * Discovery **confidence** scoring end-to-end. Generates three self-consistent
 * alert clusters designed to yield HIGH / MEDIUM / LOW confidence discoveries,
 * writes them as an Elasticsearch `_bulk` NDJSON file, and prints the commands
 * to load them and drive a generation.
 *
 * The confidence step does not query ES — it scores each discovery from the
 * anonymized-alert CSV built during retrieval. These clusters set the ECS
 * fields that drive the deterministic factors: evidence breadth
 * (event.category/event.dataset), MITRE completeness (threat.tactic.id/
 * threat.technique.id), structural coherence (shared host.name/user.name +
 * kill-chain tactic span), and counter-evidence (process.code_signature.trusted,
 * kibana.alert.severity, kibana.alert.workflow_status).
 *
 * Each doc satisfies AD's retrieval filter: @timestamp within now-24h,
 * workflow_status in (open|acknowledged) — note `closed` is filtered OUT, so the
 * LOW cluster uses `acknowledged` for its benign disposition — no
 * building_block_type, and a risk_score so it sorts into the top-N window.
 *
 * CAVEAT: Attack Discovery's LLM decides how alerts group into discoveries, so
 * these clusters make the intended grouping *likely* (shared entities, coherent
 * story) but do not guarantee one discovery per cluster. This is an integration
 * aid, not a deterministic calibration harness (use the offline Jest suite
 * confidence_tiers.test.ts for that).
 *
 * Run:
 *   node x-pack/solutions/security/plugins/discoveries/scripts/seed_confidence_scenarios_cli.js [--space default] [--out ./confidence_seed_alerts.ndjson]
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface AlertSpec {
  key: string;
  categories: string[];
  dataset: string;
  host: string;
  user: string;
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  workflowStatus: 'open' | 'acknowledged';
  riskScore: number;
  trusted?: boolean;
}

// --- HIGH: broad, one host+user, full kill-chain span, no benign signals ---
const HIGH: AlertSpec[] = [
  {
    key: 'high-1',
    categories: ['process'],
    dataset: 'endpoint.events.process',
    host: 'host-A',
    user: 'user-A',
    tacticId: 'TA0001',
    tacticName: 'Initial Access',
    techniqueId: 'T1566',
    techniqueName: 'Phishing',
    severity: 'critical',
    workflowStatus: 'open',
    riskScore: 97,
  },
  {
    key: 'high-2',
    categories: ['process'],
    dataset: 'endpoint.events.process',
    host: 'host-A',
    user: 'user-A',
    tacticId: 'TA0002',
    tacticName: 'Execution',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    severity: 'critical',
    workflowStatus: 'open',
    riskScore: 95,
  },
  {
    key: 'high-3',
    categories: ['authentication'],
    dataset: 'endpoint.events.authentication',
    host: 'host-A',
    user: 'user-A',
    tacticId: 'TA0006',
    tacticName: 'Credential Access',
    techniqueId: 'T1003',
    techniqueName: 'OS Credential Dumping',
    severity: 'high',
    workflowStatus: 'open',
    riskScore: 92,
  },
  {
    key: 'high-4',
    categories: ['network'],
    dataset: 'endpoint.events.network',
    host: 'host-A',
    user: 'user-A',
    tacticId: 'TA0011',
    tacticName: 'Command and Control',
    techniqueId: 'T1071',
    techniqueName: 'Application Layer Protocol',
    severity: 'critical',
    workflowStatus: 'open',
    riskScore: 96,
  },
  {
    key: 'high-5',
    categories: ['file'],
    dataset: 'endpoint.events.file',
    host: 'host-A',
    user: 'user-A',
    tacticId: 'TA0040',
    tacticName: 'Impact',
    techniqueId: 'T1486',
    techniqueName: 'Data Encrypted for Impact',
    severity: 'critical',
    workflowStatus: 'open',
    riskScore: 98,
  },
];

// --- MEDIUM: dual-use, one host, few tactics, one benign (low-severity) alert ---
const MEDIUM: AlertSpec[] = [
  {
    key: 'medium-1',
    categories: ['process'],
    dataset: 'endpoint.events.process',
    host: 'host-B',
    user: 'user-B',
    tacticId: 'TA0002',
    tacticName: 'Execution',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    severity: 'high',
    workflowStatus: 'open',
    riskScore: 58,
  },
  {
    key: 'medium-2',
    categories: ['network'],
    dataset: 'endpoint.events.network',
    host: 'host-B',
    user: 'user-B',
    tacticId: 'TA0005',
    tacticName: 'Defense Evasion',
    techniqueId: 'T1218',
    techniqueName: 'System Binary Proxy Execution',
    severity: 'high',
    workflowStatus: 'open',
    riskScore: 54,
  },
  {
    key: 'medium-3',
    categories: ['process'],
    dataset: 'endpoint.events.process',
    host: 'host-B',
    user: 'user-B',
    tacticId: 'TA0002',
    tacticName: 'Execution',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    severity: 'low',
    workflowStatus: 'open',
    riskScore: 40,
  },
];

// --- LOW: thin, single tactic, different entities, maximal counter-evidence.
// Uses `acknowledged` (NOT closed — closed is filtered out of AD retrieval). ---
const LOW: AlertSpec[] = [
  {
    key: 'low-1',
    categories: ['process'],
    dataset: 'endpoint.events.process',
    host: 'host-C1',
    user: 'user-C1',
    tacticId: 'TA0002',
    tacticName: 'Execution',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    severity: 'low',
    workflowStatus: 'acknowledged',
    riskScore: 31,
    trusted: true,
  },
  {
    key: 'low-2',
    categories: ['process'],
    dataset: 'endpoint.events.process',
    host: 'host-C2',
    user: 'user-C2',
    tacticId: 'TA0002',
    tacticName: 'Execution',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    severity: 'low',
    workflowStatus: 'acknowledged',
    riskScore: 30,
    trusted: true,
  },
];

const SCENARIOS: Array<{ tier: string; alerts: AlertSpec[] }> = [
  { tier: 'high', alerts: HIGH },
  { tier: 'medium', alerts: MEDIUM },
  { tier: 'low', alerts: LOW },
];

const parseArg = (name: string, fallback: string): string => {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
};

const buildAlertDoc = ({
  id,
  spec,
  timestamp,
  spaceId,
}: {
  id: string;
  spec: AlertSpec;
  timestamp: string;
  spaceId: string;
}): Record<string, unknown> => ({
  '@timestamp': timestamp,
  'event.kind': 'signal',
  'event.category': spec.categories,
  'event.dataset': spec.dataset,
  'event.module': 'endpoint',
  'host.name': spec.host,
  'user.name': spec.user,
  'process.name': 'powershell.exe',
  ...(spec.trusted
    ? { 'process.code_signature.exists': true, 'process.code_signature.trusted': true }
    : {}),
  'threat.tactic.id': spec.tacticId,
  'threat.tactic.name': spec.tacticName,
  'threat.technique.id': spec.techniqueId,
  'threat.technique.name': spec.techniqueName,
  'kibana.space_ids': [spaceId],
  'kibana.version': '9.6.0',
  'kibana.alert.uuid': id,
  'kibana.alert.status': 'active',
  'kibana.alert.workflow_status': spec.workflowStatus,
  'kibana.alert.severity': spec.severity,
  'kibana.alert.risk_score': spec.riskScore,
  'kibana.alert.rule.uuid': 'confidence-poc-rule',
  'kibana.alert.rule.name': 'Confidence POC seed rule',
  'kibana.alert.rule.rule_type_id': 'siem.queryRule',
  'kibana.alert.rule.category': 'Custom Query Rule',
});

export const run = (): void => {
  const spaceId = parseArg('space', 'default');
  const outPath = resolve(process.cwd(), parseArg('out', 'confidence_seed_alerts.ndjson'));
  const index = `.alerts-security.alerts-${spaceId}`;
  const now = Date.now();

  const lines: string[] = [];
  let offsetMinutes = 5;
  for (const { tier, alerts } of SCENARIOS) {
    alerts.forEach((spec) => {
      const id = `conf-poc-${spec.key}`;
      // Stagger timestamps within the last hour (all well inside now-24h).
      const timestamp = new Date(now - offsetMinutes * 60_000).toISOString();
      offsetMinutes += 3;
      lines.push(JSON.stringify({ index: { _index: index, _id: id } }));
      lines.push(JSON.stringify(buildAlertDoc({ id, spec, timestamp, spaceId })));
    });
    // eslint-disable-next-line no-console
    console.log(`  ${tier.padEnd(6)} → ${alerts.length} alerts (ids conf-poc-${alerts[0].key} …)`);
  }

  // Bulk NDJSON must end with a trailing newline.
  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');

  const total = SCENARIOS.reduce((n, s) => n + s.alerts.length, 0);
  /* eslint-disable no-console */
  console.log(`\nWrote ${total} alert docs → ${outPath}\n`);
  console.log('Next steps:');
  console.log('  1) Enable the flags (config/kibana.dev.yml):');
  console.log('       feature_flags.overrides:');
  console.log('         securitySolution.attackDiscoveryWorkflowsEnabled: true');
  console.log('         securitySolution.attackDiscoveryConfidenceEnabled: true');
  console.log(
    '     and turn on the per-space Advanced Setting securitySolution:enableAttackDiscoveryWorkflows.'
  );
  console.log(
    `  2) Ensure the alerts index exists (once): curl -k -u elastic:changeme -XPOST 'https://localhost:5601/api/detection_engine/index' -H 'kbn-xsrf: x'`
  );
  console.log('  3) Load the alerts:');
  console.log(
    `       curl -k -u elastic:changeme -H 'Content-Type: application/x-ndjson' -XPOST 'https://localhost:9200/_bulk?refresh=wait_for' --data-binary @${outPath}`
  );
  console.log(
    '  4) Trigger a generation (POST /internal/attack_discovery/_generate with a GenAI connector_id and'
  );
  console.log(
    `     alerts_index_pattern "${index}"), then read back GET /api/attack_discovery/_find`
  );
  console.log('     and inspect each discovery.confidence.\n');
  console.log(
    'Note: Attack Discovery decides alert grouping, so band outcomes are indicative, not guaranteed.'
  );
  /* eslint-enable no-console */
};
