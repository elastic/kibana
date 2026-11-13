#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds Alert Triage decisions and the alerts they match, so the sweep's decision matching can be
 * tried without a model or a proposal approval. It writes, into a local stack:
 *
 *   - 11 open alerts of one fixture rule, in three exact patterns:
 *       A  acme-update.exe   5 low + 1 high alerts   an approved decision      -> would_close (low), kept with a human (high)
 *       B  scan.exe          3 medium alerts         a dismissed decision       -> would_skip
 *       C  unknown.exe       2 low alerts            no decision                -> never matched
 *   - the two decisions (`fp-decision-<hash>`, `fp-dismissal-<hash>`) in the
 *     `.ai-index-idx-security-triage-decisions` Knowledge Item index, built with the same code the
 *     store step uses.
 *
 * The first write creates that index from Elasticsearch's managed AI index template, which maps
 * the space privilege. The template has a semantic field, so Elasticsearch needs machine learning
 * on, for its default `.elser-2-elasticsearch` endpoint.
 *
 * The keys come from the real key code, so a change to the key rules changes the seed with it.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/seed_triage_decisions.js [options]
 *
 *   --es      Elasticsearch base URL (default: http://localhost:9200)
 *   --space   Kibana space id (default: default)
 *   --clean   Delete what this script wrote instead of seeding
 *   --ui      Write alerts only, for a manual test through the UI: first | matching | mixed (see UI mode)
 *
 * UI mode (`--ui first|matching|mixed`) writes alerts only, with no decision, for a manual test that
 * goes through the UI: a real model analyses the alerts, an analyst approves the proposal, and the
 * approval stores the decision. Run the three phases in order, and run an Alert Triage sweep (run the
 * `system-security-floor-alert-triage-default` workflow) between them:
 *
 *   first     6 low alerts of a benign vendor updater (pattern U) in one rule
 *   matching  6 more alerts of the same pattern U
 *   mixed     3 alerts of pattern U (match), and 5 near misses that must NOT match: the same
 *             executable with another signer, the same executable started by another parent, a
 *             high severity alert of pattern U, the same pattern in another rule, and another
 *             executable
 *
 * Local stacks only: it uses the development login (`ES_USERNAME` / `ES_PASSWORD`, default
 * elastic / changeme).
 */

require('@kbn/setup-node-env');
require('@kbn/swc-register').install();

const { randomUUID } = require('crypto');
const {
  decisionId,
  buildDecisionDocument,
  groupByStrictKey,
} = require('../server/alert_triage/fp_decisions');
const { TRIAGE_DECISIONS_AI_INDEX_DEST } = require('../common/step_types/triage_decisions_index');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const ES_URL = flag('--es', 'http://localhost:9200');
const SPACE = flag('--space', 'default');
const CLEAN = args.includes('--clean');
const UI_PHASE = flag('--ui', '');
const ALERTS_INDEX = `.alerts-security.alerts-${SPACE}`;
const DECISIONS_INDEX = TRIAGE_DECISIONS_AI_INDEX_DEST.value;
const AUTH = `${process.env.ES_USERNAME ?? 'elastic'}:${process.env.ES_PASSWORD ?? 'changeme'}`;
const FIXTURE_TAG = 'triage-decisions-fixture';
// A fixed rule, so a second run adds alerts to the same rule and the keys stay the same.
const RULE_UUID = '7c1f0c9e-5a3b-4f6e-9a21-0c0ffee00001';
const RULE_REVISION = 1;
const RULE_NAME = 'Triage decisions fixture: unsigned updater runs';

const RISK_SCORES = { low: 21, medium: 47, high: 73 };
const PATTERNS = {
  A: { executable: 'C:\\Program Files\\Acme\\Updater\\acme-update.exe', subject: 'Acme Corp' },
  B: { executable: 'C:\\Tools\\Inventory\\scan.exe', subject: 'Contoso IT' },
  C: { executable: 'C:\\Users\\Public\\unknown.exe', subject: 'Unknown Publisher' },
};
const ALERTS = [
  ...Array.from({ length: 5 }, () => ({ pattern: 'A', severity: 'low' })),
  { pattern: 'A', severity: 'high' },
  ...Array.from({ length: 3 }, () => ({ pattern: 'B', severity: 'medium' })),
  ...Array.from({ length: 2 }, () => ({ pattern: 'C', severity: 'low' })),
];

const es = async (method, path, body, ndjson = false) => {
  const res = await fetch(`${ES_URL}${path}`, {
    method,
    headers: {
      'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json',
      Authorization: `Basic ${Buffer.from(AUTH).toString('base64')}`,
    },
    body: ndjson || body === undefined ? body : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
};

const alertDocument = ({
  executable,
  subject,
  severity,
  ruleUuid = RULE_UUID,
  ruleName = RULE_NAME,
  timestamp = new Date(),
  extra = {},
}) => {
  const now = timestamp.toISOString();
  const uuid = randomUUID();
  return {
    uuid,
    doc: {
      '@timestamp': now,
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'host.name': 'triage-fixture-host',
      'host.os.type': 'windows',
      'user.name': 'triage-fixture-user',
      'process.name': executable.split('\\').pop(),
      'process.executable': executable,
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': subject,
      'kibana.version': '9.5.0',
      'kibana.alert.uuid': uuid,
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.workflow_assignee_ids': [],
      'kibana.alert.space_ids': [SPACE],
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': RISK_SCORES[severity],
      'kibana.alert.reason': `${ruleName} on triage-fixture-host`,
      'kibana.alert.depth': 1,
      'kibana.alert.start': now,
      'kibana.alert.last_detected': now,
      'kibana.alert.original_time': now,
      'kibana.alert.rule.uuid': ruleUuid,
      'kibana.alert.rule.rule_id': 'triage-decisions-fixture',
      'kibana.alert.rule.revision': RULE_REVISION,
      'kibana.alert.rule.name': ruleName,
      'kibana.alert.rule.severity': severity,
      'kibana.alert.rule.risk_score': 21,
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
      'kibana.alert.rule.category': 'Custom Query Rule',
      'kibana.alert.rule.type': 'query',
      'kibana.alert.rule.enabled': true,
      'kibana.alert.rule.tags': [FIXTURE_TAG],
      'kibana.alert.rule.execution.uuid': randomUUID(),
      'kibana.alert.rule.parameters': { type: 'query', language: 'kuery', query: '*' },
      ...extra,
    },
  };
};

const decisionDocuments = (alerts) => {
  const byPattern = (name) =>
    alerts.filter(({ pattern }) => pattern === name).map(({ uuid, doc }) => ({ id: uuid, doc }));
  const group = (name) => groupByStrictKey({ alerts: byPattern(name), spaceId: SPACE }).groups[0];
  const provenance = (proposalId) => ({
    spaceId: SPACE,
    proposalId,
    investigationId: 'triage-decisions-fixture',
    approver: 'seed-script',
    now: new Date(),
  });
  return [
    {
      id: decisionId('false_positive', group('A').hash),
      doc: buildDecisionDocument({
        kind: 'false_positive',
        group: group('A'),
        provenance: provenance('seed-approved'),
      }),
    },
    {
      id: decisionId('do_not_propose', group('B').hash),
      doc: buildDecisionDocument({
        kind: 'do_not_propose',
        group: group('B'),
        provenance: provenance('seed-dismissed'),
      }),
    },
  ];
};

const clean = async () => {
  const alerts = await es(
    'POST',
    `/${ALERTS_INDEX}/_delete_by_query?refresh=true&conflicts=proceed`,
    {
      query: { term: { 'kibana.alert.rule.tags': FIXTURE_TAG } },
    }
  );
  console.log(`Deleted ${alerts.deleted} fixture alert(s) from ${ALERTS_INDEX}.`);
  const decisions = await es(
    'POST',
    `/${DECISIONS_INDEX}/_delete_by_query?refresh=true&conflicts=proceed`,
    {
      // UI mode decisions are written by a real approval, so they carry the UI rules, not the fixture investigation.
      query: {
        bool: {
          should: [
            { term: { 'attributes.investigation_id': 'triage-decisions-fixture' } },
            { terms: { 'attributes.rule_id': [UI_RULE.ruleUuid, UI_OTHER_RULE.ruleUuid] } },
          ],
          minimum_should_match: 1,
        },
      },
    }
  ).catch((error) => {
    if (String(error).includes('index_not_found_exception')) return { deleted: 0 };
    throw error;
  });
  console.log(`Deleted ${decisions.deleted} fixture decision(s) from ${DECISIONS_INDEX}.`);
};

const assertAlertsIndex = async () => {
  // Writing to a missing alerts alias would create a dynamically mapped index that the alerts
  // template does not cover, so stop and say how to create the real one.
  const aliasResponse = await fetch(`${ES_URL}/_alias/${ALERTS_INDEX}`, {
    headers: { Authorization: `Basic ${Buffer.from(AUTH).toString('base64')}` },
  });
  if (!aliasResponse.ok) {
    throw new Error(
      `${ALERTS_INDEX} does not exist yet. Open Security in Kibana once, or call POST /api/detection_engine/index, then run this again.`
    );
  }
};

const seed = async () => {
  await assertAlertsIndex();
  const alerts = ALERTS.map(({ pattern, severity }) => ({
    ...alertDocument({ ...PATTERNS[pattern], severity }),
    pattern,
  }));
  const decisions = decisionDocuments(alerts);

  const alertLines = alerts.flatMap(({ uuid, doc }) => [
    JSON.stringify({ create: { _index: ALERTS_INDEX, _id: uuid } }),
    JSON.stringify(doc),
  ]);
  const alertResult = await es('POST', '/_bulk?refresh=true', `${alertLines.join('\n')}\n`, true);
  if (alertResult.errors)
    throw new Error(JSON.stringify(alertResult.items.find((i) => i.create.error)));

  const decisionLines = decisions.flatMap(({ id, doc }) => [
    JSON.stringify({ index: { _index: DECISIONS_INDEX, _id: id } }),
    JSON.stringify(doc),
  ]);
  const decisionResult = await es(
    'POST',
    '/_bulk?refresh=true',
    `${decisionLines.join('\n')}\n`,
    true
  );
  if (decisionResult.errors) {
    throw new Error(JSON.stringify(decisionResult.items.find((i) => i.index.error)));
  }

  console.log(`Indexed ${alerts.length} open alerts into ${ALERTS_INDEX}.`);
  console.log(`Wrote 2 decisions into ${DECISIONS_INDEX}:`);
  for (const { id } of decisions) console.log(`  ${id}`);
  console.log('\nIn shadow mode the next sweep should tag:');
  console.log('  5 low alerts of pattern A   az:would_close:<fp-decision id>');
  console.log('  3 alerts of pattern B       az:would_skip:<fp-dismissal id>');
  console.log(
    'and leave the high alert of A and the 2 alerts of C untagged (the high alert is counted as excluded_by_severity).'
  );
};

// ── Shared writer ─────────────────────────────────────────────────────────────

const bulk = async (index, action, rows) => {
  const lines = rows.flatMap(({ id, doc }) => [
    JSON.stringify({ [action]: { _index: index, _id: id } }),
    JSON.stringify(doc),
  ]);
  const result = await es('POST', '/_bulk', `${lines.join('\n')}\n`, true);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items.find((item) => item[action].error)));
  }
};

// ── UI mode ───────────────────────────────────────────────────────────────────

const UI_RULE = {
  ruleUuid: '7c1f0c9e-5a3b-4f6e-9a21-0000000b0001',
  ruleName: 'Triage UI test: vendor updater runs',
};
const UI_OTHER_RULE = {
  ruleUuid: '7c1f0c9e-5a3b-4f6e-9a21-0000000b0002',
  ruleName: 'Triage UI test: vendor updater runs (copy)',
};
const UI_UPDATER = 'C:\\Program Files\\Acme\\Updater\\acme-update.exe';
// Pattern U: the strict key is the rule, the executable, the signer and the parent executable.
const uiAlert = (overrides = {}) => {
  const executable = overrides.executable ?? UI_UPDATER;
  const { extra, ...rest } = overrides;
  return {
    ...UI_RULE,
    executable,
    subject: 'Acme Corp',
    severity: 'low',
    ...rest,
    extra: {
      'process.command_line': `"${executable}" --scheduled-check`,
      'process.parent.name': 'services.exe',
      'process.parent.executable': 'C:\\Windows\\System32\\services.exe',
      'user.name': 'SYSTEM',
      ...extra,
    },
  };
};

const UI_PHASES = {
  first: [{ label: 'pattern U (benign updater)', count: 6, alert: uiAlert() }],
  matching: [{ label: 'pattern U again', count: 6, alert: uiAlert() }],
  mixed: [
    { label: 'pattern U: must match', count: 3, alert: uiAlert() },
    {
      label: 'same executable, other signer: must not match',
      count: 1,
      alert: uiAlert({
        subject: 'Unknown Publisher',
        extra: { 'process.code_signature.trusted': false },
      }),
    },
    {
      label: 'same executable, other parent: must not match',
      count: 1,
      alert: uiAlert({
        extra: {
          'process.parent.name': 'cmd.exe',
          'process.parent.executable': 'C:\\Windows\\System32\\cmd.exe',
        },
      }),
    },
    {
      label: 'pattern U, high severity: matches but is not closable',
      count: 1,
      alert: uiAlert({ severity: 'high' }),
    },
    {
      label: 'pattern U in another rule: must not match',
      count: 1,
      alert: uiAlert(UI_OTHER_RULE),
    },
    {
      label: 'another executable: must not match',
      count: 1,
      alert: uiAlert({
        executable: 'C:\\Program Files\\Acme\\Updater\\acme-helper.exe',
        subject: 'Acme Corp',
      }),
    },
  ],
};

const uiSeed = async () => {
  const phase = UI_PHASES[UI_PHASE];
  if (!phase) throw new Error(`--ui takes one of: ${Object.keys(UI_PHASES).join(', ')}`);
  await assertAlertsIndex();
  const rows = phase.flatMap(({ label, count, alert }) => {
    console.log(`  ${String(count).padStart(2)} ${alert.severity.padEnd(6)} ${label}`);
    return Array.from({ length: count }, () => {
      const { uuid, doc } = alertDocument(alert);
      return { id: uuid, doc };
    });
  });
  await bulk(ALERTS_INDEX, 'create', rows);
  await es('POST', `/${ALERTS_INDEX}/_refresh`);
  console.log(`Wrote ${rows.length} open alerts. No decision was written.`);
};

const run = () => {
  if (CLEAN) return clean();
  if (UI_PHASE) return uiSeed();
  return seed();
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
