#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Drives one detection rule past the Alert Triage per-rule closure proposal limit.
 *
 * The Worker hands each batch's closure proposal to `system-security-floor-alert-triage-review`,
 * which allows a limited number of reviews to wait for a decision per rule (`settings.concurrency.max`,
 * read from the workflow definition). This script indexes several
 * batches of clear false positives that all carry the SAME rule uuid, runs the Worker once per
 * batch, then reads back what each review did:
 *
 *   - the first `max` reviews park on their proposal (`waiting_for_child`)
 *   - every further review is `skipped`, and its Investigation says no proposal was created
 *
 * Needs a running stack with Alert Analysis and the Alert Triage Worker enabled (Manual autonomy,
 * or the proposals resolve on their own), and a connector for the `alertzero_reasoning` tier.
 * Each batch costs one LLM analysis, so keep --runs small.
 *
 * Usage:
 *   node trigger_alert_triage_review_limit.js [options]
 *
 *   --es          Elasticsearch base URL (default: http://localhost:9200)
 *   --kibana      Kibana base URL (default: http://localhost:5601)
 *   --space       Kibana space id (default: default)
 *   --runs        Worker runs to start (default: the limit plus 2)
 *   --stagger-ms  Delay between starting runs (default: 1500)
 *   --timeout-s   How long to wait for the Worker runs to finish (default: 900)
 *   --no-wait     Start the runs and print the execution ids without waiting
 *   --clean       Delete the alerts this script indexed instead of running
 *
 * Proposals raised by a run stay pending in the decision queue. Dismiss them there when done.
 */

const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { parse } = require('yaml');

// The limit is read from the workflow so this script cannot drift from what the engine enforces.
const REVIEW_WORKFLOW_YAML = path.resolve(
  __dirname,
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/floor_alert_triage_review.yaml'
);
const readReviewLimit = () => {
  const max = parse(fs.readFileSync(REVIEW_WORKFLOW_YAML, 'utf8'))?.settings?.concurrency?.max;
  if (!Number.isInteger(max) || max < 1) {
    throw new Error(`No settings.concurrency.max in ${REVIEW_WORKFLOW_YAML}`);
  }
  return max;
};
const REVIEW_LIMIT = readReviewLimit();

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const ES_URL = flag('--es', 'http://localhost:9200');
const KB_URL = flag('--kibana', 'http://localhost:5601');
const SPACE = flag('--space', 'default');
const RUNS = Number(flag('--runs', String(REVIEW_LIMIT + 2)));
const STAGGER_MS = Number(flag('--stagger-ms', '1500'));
const TIMEOUT_S = Number(flag('--timeout-s', '900'));
const NO_WAIT = args.includes('--no-wait');
const CLEAN = args.includes('--clean');
const INDEX = `.alerts-security.alerts-${SPACE}`;
const AUTH = `${process.env.ES_USERNAME ?? 'elastic'}:${process.env.ES_PASSWORD ?? 'changeme'}`;
const AUTH_HEADER = 'Basic ' + Buffer.from(AUTH).toString('base64');

const FIXTURE_TAG = 'alert-triage-limit-fixture';
// Workers install per space as `${workerId}-${spaceId}`; the bare id 404s.
const WORKER_ID = `system-security-floor-alert-triage-${SPACE}`;
// The default space has no `/s/<space>` prefix at all.
const SPACE_PATH_PREFIX = SPACE === 'default' ? '' : `/s/${encodeURIComponent(SPACE)}`;
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const esRequest = async (method, path, body) => {
  const res = await fetch(`${ES_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
};

const kbRequest = async (method, path, body) => {
  const res = await fetch(`${KB_URL}${SPACE_PATH_PREFIX}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
      Authorization: AUTH_HEADER,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
};

const ts = () => new Date().toISOString();

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Two benign, signed, scheduled-style alerts (the eval fixture's tier 4), so the analysis
// classifies them false_positive above the confidence floor and a closure proposal is raised.

const FP_TEMPLATES = [
  {
    label: 'threshold',
    severity: 'low',
    riskScore: 21,
    ruleName: 'High Volume of Process Executions',
    tactic: { id: 'TA0002', name: 'Execution' },
    technique: { id: 'T1059', name: 'Command and Scripting Interpreter' },
    observable: {
      'event.category': ['process'],
      'event.type': ['start'],
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
    label: 'scheduled-task',
    severity: 'low',
    riskScore: 18,
    ruleName: 'High Volume of Process Executions',
    tactic: { id: 'TA0003', name: 'Persistence' },
    technique: { id: 'T1053', name: 'Scheduled Task/Job' },
    observable: {
      'event.category': ['process'],
      'event.type': ['start'],
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

const buildDoc = ({ alertUuid, ruleUuid, ruleId, template }) => {
  const timestamp = ts();
  return {
    '@timestamp': timestamp,
    agent: { id: `agent-${alertUuid}`, type: 'endpoint', version: '8.19.0' },
    'data_stream.dataset': 'endpoint.alerts',
    'data_stream.namespace': 'default',
    'data_stream.type': 'logs',
    'ecs.version': '8.11.0',
    'host.id': `host-${alertUuid}`,
    'host.os.name': 'Windows',
    'host.os.family': 'windows',
    'host.os.type': 'windows',
    'event.kind': 'signal',
    'event.module': 'endpoint',
    'event.dataset': 'endpoint.alerts',
    'event.outcome': 'success',
    'event.created': timestamp,
    'event.ingested': timestamp,
    'kibana.version': '8.19.0',
    'kibana.alert.depth': 1,
    'kibana.alert.ancestors': [
      {
        depth: 0,
        index: '.ds-logs-endpoint.alerts-default',
        id: `${alertUuid}-anc`,
        type: 'event',
      },
    ],
    'kibana.alert.original_time': timestamp,
    'kibana.alert.last_detected': timestamp,
    'kibana.alert.start': timestamp,
    'kibana.alert.space_ids': [SPACE],
    'kibana.alert.workflow_assignee_ids': [],
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.status': 'active',
    'kibana.alert.uuid': alertUuid,
    'kibana.alert.severity': template.severity,
    'kibana.alert.risk_score': template.riskScore,
    'kibana.alert.reason': `${template.ruleName} triggered`,
    // One rule for every batch: the review's limit is keyed on this uuid, and the analysis
    // sub-workflow rejects a batch that spans more than one rule.
    'kibana.alert.rule.uuid': ruleUuid,
    'kibana.alert.rule.rule_id': ruleId,
    'kibana.alert.rule.name': template.ruleName,
    'kibana.alert.rule.description': 'Threshold rule that fires when a host exceeds a baseline.',
    'kibana.alert.rule.severity': template.severity,
    'kibana.alert.rule.risk_score': template.riskScore,
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.alert.rule.type': 'query',
    'kibana.alert.rule.author': [],
    'kibana.alert.rule.enabled': true,
    'kibana.alert.rule.from': 'now-3660s',
    'kibana.alert.rule.interval': '1h',
    'kibana.alert.rule.indices': ['logs-endpoint.alerts-*'],
    'kibana.alert.rule.exceptions_list': [],
    'kibana.alert.rule.tags': [FIXTURE_TAG],
    'kibana.alert.rule.execution.uuid': `${alertUuid}-exec`,
    'kibana.alert.rule.parameters': { type: 'query', language: 'kuery', query: '*' },
    'kibana.alert.rule.threat': [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: template.tactic.id, name: template.tactic.name, reference: '' },
        technique: [{ id: template.technique.id, name: template.technique.name, reference: '' }],
      },
    ],
    ...template.observable,
  };
};

// ── Clean mode ────────────────────────────────────────────────────────────────

const clean = async () => {
  console.log(`Deleting alerts tagged ${FIXTURE_TAG} from ${INDEX}…`);
  const result = await esRequest('POST', `/${INDEX}/_delete_by_query?refresh=true`, {
    query: { term: { 'kibana.alert.rule.tags': FIXTURE_TAG } },
  });
  console.log(`Deleted ${result.deleted} document(s).`);
  console.log('Pending proposals are not touched: dismiss them in the decision queue.');
};

// ── Run mode ──────────────────────────────────────────────────────────────────

const startBatch = async ({ batchNumber, ruleUuid, ruleId }) => {
  const alertIds = [];
  for (const template of FP_TEMPLATES) {
    // Fresh uuid per alert so the analysis's already_analyzed tag gate never suppresses a batch.
    const alertUuid = randomUUID();
    await esRequest(
      'PUT',
      `/${INDEX}/_doc/${alertUuid}?refresh=true`,
      buildDoc({
        alertUuid,
        ruleUuid,
        ruleId,
        template,
      })
    );
    alertIds.push({ _id: alertUuid, _index: INDEX });
  }

  const { workflowExecutionId } = await kbRequest(
    'POST',
    `/api/workflows/workflow/${WORKER_ID}/run`,
    {
      inputs: { event: { triggerType: 'alert', alertIds } },
    }
  );
  console.log(
    `  batch ${batchNumber}: Worker run ${workflowExecutionId}\n` +
      `    ${KB_URL}${SPACE_PATH_PREFIX}/app/workflows/executions/${workflowExecutionId}`
  );
  return { batchNumber, workerExecutionId: workflowExecutionId };
};

const getExecution = (id) =>
  kbRequest('GET', `/api/workflows/executions/${id}?includeInput=false&includeOutput=true`);

const waitForTerminal = async (executionId, deadline) => {
  for (;;) {
    const execution = await getExecution(executionId);
    if (TERMINAL.has(execution.status)) return execution;
    if (Date.now() > deadline) return execution;
    await sleep(5000);
  }
};

// The Worker finishes as soon as it has handed the review off, so the review can still be starting.
// Settled means parked on its proposal, skipped, or already done.
const waitForReviewToSettle = async (reviewId) => {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const review = await getExecution(reviewId);
    if (!['pending', 'running'].includes(review.status) || Date.now() > deadline) return review;
    await sleep(2000);
  }
};

// Which way the Worker took the batch, read from the branch that ran.
const workerOutcome = (execution) => {
  const ran = new Set(execution.stepExecutions.map(({ stepId }) => stepId));
  if (execution.status === 'failed') return 'worker failed';
  if (ran.has('post_comment_review_limit')) return 'skipped by limit';
  if (ran.has('post_comment_review_started')) return 'review started';
  if (ran.has('post_comment_review_failed')) return 'review failed';
  if (ran.has('post_comment_outcome_no_fp')) return 'no FP candidates (no review)';
  return execution.status;
};

const reviewExecutionId = (execution) =>
  execution.stepExecutions.find(({ stepId }) => stepId === 'start_fp_review')?.output?.executionId;

const run = async () => {
  if (RUNS < 1) throw new Error('--runs must be at least 1');
  const ruleUuid = randomUUID();
  const ruleId = `alert-triage-limit-${ruleUuid.slice(0, 8)}`;

  console.log(`Target index: ${INDEX}  (ES: ${ES_URL}, Kibana: ${KB_URL}${SPACE_PATH_PREFIX})`);
  console.log(`Rule uuid shared by every batch: ${ruleUuid}`);
  console.log(`Starting ${RUNS} Worker runs (limit is ${REVIEW_LIMIT} waiting reviews per rule)\n`);

  const started = [];
  for (let batchNumber = 1; batchNumber <= RUNS; batchNumber++) {
    started.push(await startBatch({ batchNumber, ruleUuid, ruleId }));
    if (batchNumber < RUNS) await sleep(STAGGER_MS);
  }

  if (NO_WAIT) {
    console.log('\n--no-wait: not reading the reviews back.');
    return;
  }

  console.log(`\nWaiting for the Worker runs (up to ${TIMEOUT_S}s)…`);
  const deadline = Date.now() + TIMEOUT_S * 1000;
  const rows = [];
  for (const { batchNumber, workerExecutionId } of started) {
    const worker = await waitForTerminal(workerExecutionId, deadline);
    const reviewId = reviewExecutionId(worker);
    const review = reviewId ? await waitForReviewToSettle(reviewId) : undefined;
    rows.push({
      batch: batchNumber,
      worker: worker.status,
      workerOutcome: workerOutcome(worker),
      review: review?.status ?? '-',
      concurrencyGroupKey: review?.concurrencyGroupKey ?? '-',
      reviewId: reviewId ?? '-',
    });
  }

  console.log('');
  console.table(
    rows.map(({ batch, worker, workerOutcome: outcome, review, concurrencyGroupKey }) => ({
      batch,
      worker,
      workerOutcome: outcome,
      review,
      concurrencyGroupKey,
    }))
  );

  const waiting = rows.filter((row) => row.review === 'waiting_for_child').length;
  const skipped = rows.filter((row) => row.review === 'skipped').length;
  const withReview = rows.filter((row) => row.reviewId !== '-').length;
  const sameKey = new Set(
    rows.filter((row) => row.reviewId !== '-').map((r) => r.concurrencyGroupKey)
  );
  console.log(`Reviews started: ${withReview} of ${RUNS} batches`);
  console.log(`Waiting on a proposal: ${waiting}   Skipped by the limit: ${skipped}`);
  console.log(`Concurrency keys seen: ${[...sameKey].join(', ') || '-'}`);

  const expectedSkipped = Math.max(0, withReview - REVIEW_LIMIT);
  if (withReview <= REVIEW_LIMIT) {
    console.log(
      `\nINCONCLUSIVE: only ${withReview} batch(es) produced a review, so the limit of ${REVIEW_LIMIT} ` +
        'was never reached. Some batches were probably not classified as false positives above the ' +
        'confidence floor (see "no FP candidates" above); run again with more --runs.'
    );
    process.exitCode = 2;
  } else if (waiting <= REVIEW_LIMIT && skipped === expectedSkipped && sameKey.size === 1) {
    console.log(`\nPASS: ${waiting} waiting, ${skipped} skipped, one key per rule.`);
  } else {
    console.log(
      `\nFAIL: expected at most ${REVIEW_LIMIT} waiting and ${expectedSkipped} skipped under one key.`
    );
    process.exitCode = 1;
  }
  console.log(`\nCleanup: node ${process.argv[1]} --clean   (then dismiss the pending proposals)`);
};

(async () => {
  if (CLEAN) {
    await clean();
  } else {
    await run();
  }
})().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
