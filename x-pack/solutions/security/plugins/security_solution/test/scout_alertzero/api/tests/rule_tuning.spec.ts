/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import {
  apiTest,
  assertExecutionCompleted,
  cancelNewExecutions,
  createServiceAccount,
  deleteInvestigation,
  deleteServiceAccount,
  getAdminApi,
  getWorker,
  listChatCompletionConnectors,
  listExecutionIds,
  ok,
  pollUntil,
  resetWorker,
  tags,
  testData,
  updateWorker,
  withAlertZeroEnabledInSpace,
  waitForExecution,
  waitForNewExecution,
} from '../fixtures';
import type { AlertZeroApi } from '../fixtures';
import {
  ADD_RULE_EXCEPTION_ACTION_ID,
  actionTarget,
  approveTuningProposal,
  dismissTuningProposal,
  dismissRunTuningProposals,
  EDIT_RULE_ACTION_ID,
  explainMissingTuningProposal,
  listTuningProposals,
  RULE_TUNING_REVIEW_WORKFLOW_ID,
  RULE_TUNING_WORKER_ID,
} from '../fixtures/rule_tuning_helpers';
import type { TuningProposal } from '../fixtures/rule_tuning_helpers';

const WORKER_ID = RULE_TUNING_WORKER_ID;
const ENTRY_PROPOSAL_TITLE = 'Review rule for tuning';

// The FP pattern the tuning must scope to: one service account hammering one file server.
const FP_HOST = 'srv-files-02';
const FP_USER = 'svc-backup';
const TP_USER = 'matt.hart';
const FP_MESSAGE = `${FP_USER} backup job flagged again`;
const TP_MESSAGE = `${TP_USER} interactive access flagged`;
const FP_COUNT = 12;
const OPEN_COUNT = 9;
const TOTAL_COUNT = FP_COUNT + OPEN_COUNT;
// 12/21 = 57.1428...%: a rate whose rounded rendering differs from the unrounded one, which is
// what the security-team#19992 assertion below reads out of the review's own proposal text.
const FP_RATE_UNROUNDED = (FP_COUNT * 100) / TOTAL_COUNT;
const FP_RATE_ROUNDED_TO_INTEGER = Math.round(FP_RATE_UNROUNDED); // 57
const FP_RATE_ROUNDED_TO_ONE_DECIMAL = Math.round(FP_RATE_UNROUNDED * 10) / 10; // 57.1

interface SeededRule {
  readonly ruleId: string;
  readonly revision: number;
  readonly runMarker: string;
}

interface ExceptionEntry {
  readonly field?: unknown;
  readonly operator?: unknown;
  readonly type?: unknown;
  readonly value?: unknown;
  readonly values?: unknown;
}

interface ExceptionItem {
  readonly id?: unknown;
  readonly list_id?: unknown;
  readonly entries?: ExceptionEntry[];
}

const INCLUSION_OPERATORS = ['is', 'is_one_of', 'included'];
const EXCLUSION_OPERATORS = ['is_not', 'is_not_one_of', 'does_not_match', 'excluded'];

let api: AlertZeroApi | undefined;
let esClientRef: EsClient | undefined;
/** Restores the per-space AlertZero gate this suite enabled in beforeAll (see beforeAll). */
let restoreAlertZero: (() => Promise<void>) | undefined;
const serviceAccountIds: string[] = [];
const seededRules: SeededRule[] = [];
/** The rule the scoped exception was applied to: the negative control exercises that rule. */
let tunedRule: SeededRule | undefined;
/** Control index the negative control points the tuned rule at, for teardown. */
let controlIndex: string | undefined;
/**
 * Execution ids that predate each sweep this suite started, per workflow: `runTuningSweep`
 * records them right before enabling the worker, so `afterAll` can cancel and drain exactly
 * the runs this suite started before the service accounts are deleted.
 */
const executionBaselines: Map<string, string[]> = new Map();
/**
 * Investigations the tuning reviews created, by the conversations behind the proposals this run
 * leaves (each review parks a persistent Investigation; without this they accumulate in the
 * shared default space pointing at rules this suite deletes). Populated by the tests as they
 * read proposals, and by teardown as it dismisses them.
 */
const investigationIds = new Set<string>();

const entryValues = (entry: ExceptionEntry): string[] => {
  const values: string[] = [];
  if (typeof entry.value === 'string') {
    values.push(entry.value);
  }
  if (Array.isArray(entry.values)) {
    entry.values.forEach((value) => {
      if (typeof value === 'string') {
        values.push(value);
      }
    });
  }
  return values;
};

const entryOperators = (entry: ExceptionEntry): string[] => {
  // A proposal's entries carry `operator: is`; the persisted item stores the platform's
  // `type: match` + `operator: included` (and `type: match_any` for a values list), so both
  // vocabularies are read as the same conditions.
  if (entry.type === 'match_any') {
    return ['is_one_of'];
  }
  return typeof entry.operator === 'string' ? [entry.operator] : [];
};

const readEntries = (
  input: Record<string, unknown> | undefined,
  label: string
): ExceptionEntry[] => {
  const entries = input?.entries;
  if (!Array.isArray(entries)) {
    throw new Error(`${label} carries no exception entries: ${JSON.stringify(input)}`);
  }
  return entries as ExceptionEntry[];
};

/**
 * The exception has to name the observed false-positive pattern: `user.name is svc-backup` AND
 * `host.name is srv-files-02` in one item, so both conditions must hold together. Either one
 * alone either misses the noise (user alone) or excludes every other user on that host (host
 * alone), so the entries are asserted field by field rather than through the serialized input.
 */
const assertScopedToFpPattern = (entries: ExceptionEntry[], label: string): void => {
  const inclusions = entries.filter((entry) =>
    entryOperators(entry).some((operator) => INCLUSION_OPERATORS.includes(operator))
  );
  const userEntry = inclusions.find(
    (entry) => entry.field === 'user.name' && entryValues(entry).includes(FP_USER)
  );
  if (!userEntry) {
    throw new Error(
      `${label} has no "user.name is ${FP_USER}" entry, so it is not scoped to the service account: ${JSON.stringify(
        entries
      )}`
    );
  }
  const hostEntry = inclusions.find(
    (entry) => entry.field === 'host.name' && entryValues(entry).includes(FP_HOST)
  );
  if (!hostEntry) {
    throw new Error(
      `${label} has no "host.name is ${FP_HOST}" entry, so it is not scoped to the file server: ${JSON.stringify(
        entries
      )}`
    );
  }
  const serialized = JSON.stringify(entries);
  if (serialized.includes(TP_USER)) {
    throw new Error(`${label} names the true-positive user ${TP_USER}: ${serialized}`);
  }
  const negated = entries.filter(
    (entry) =>
      (entry.field === 'user.name' || entry.field === 'host.name') &&
      entryOperators(entry).some((operator) => EXCLUSION_OPERATORS.includes(operator))
  );
  if (negated.length > 0) {
    throw new Error(
      `${label} narrows the false-positive fields by exclusion instead of inclusion: ${JSON.stringify(
        negated
      )}`
    );
  }
};

/** Creates the noisy rule the sweep should pick, then indexes its FP and TP alerts. */
const seedNoisyRule = async (adminApi: AlertZeroApi, esClient: EsClient): Promise<SeededRule> => {
  const runMarker = `alertzero-e2e-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  ok(
    await adminApi.public('POST', '/api/detection_engine/index'),
    'create the detection alerts index'
  );

  const rule = ok(
    await adminApi.public<{ id: string; revision: number }>('POST', '/api/detection_engine/rules', {
      body: {
        name: `E2E noisy backup rule ${runMarker}`,
        rule_id: `e2e-noisy-backup-${runMarker}`,
        description: 'AlertZero e2e seeded noisy rule',
        type: 'query',
        status: 'active',
        severity: 'low',
        risk_score: 10,
        interval: '5m',
        from: 'now-10m',
        index: [testData.ALERTS_INDEX],
        language: 'kuery',
        // Must match nothing. The rule reads the alerts index it is seeded into, so a matching query
        // makes the detection engine add open alerts of its own, which dilutes the seeded FP rate
        // below the sweep's 50% harvest threshold. The sweep then starts zero reviews.
        query: 'alertzero_e2e_never_matches:true',
      },
    }),
    'create the detection rule'
  );
  // Registered before the alert bulk: a partially written bulk (or a throw while indexing) must
  // not orphan the rule, because teardown only visits what `seededRules` holds.
  const seeded = { ruleId: rule.id, revision: rule.revision, runMarker };
  seededRules.push(seeded);

  const alertDoc = (closed: boolean, number: number) => ({
    '@timestamp': new Date(Date.now() - number * 60_000).toISOString(),
    labels: { ad_portable_seed: runMarker },
    rule: { id: rule.id, name: `E2E noisy backup rule ${runMarker}` },
    host: { name: FP_HOST },
    user: { name: closed ? FP_USER : TP_USER },
    'kibana.alert.rule.uuid': rule.id,
    'kibana.alert.rule.name': `E2E noisy backup rule ${runMarker}`,
    'kibana.alert.rule.revision': rule.revision,
    'kibana.alert.workflow_status': closed ? 'closed' : 'open',
    ...(closed ? { 'kibana.alert.workflow_reason': 'false_positive' } : {}),
    'kibana.alert.workflow_tags': [],
    'kibana.alert.severity': 'low',
    'kibana.alert.status': closed ? 'closed' : 'active',
    message: closed ? FP_MESSAGE : TP_MESSAGE,
  });
  const documents = [
    ...Array.from({ length: FP_COUNT }, (_, i) => alertDoc(true, i)),
    ...Array.from({ length: OPEN_COUNT }, (_, i) => alertDoc(false, FP_COUNT + i)),
  ];
  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations: documents.flatMap((doc, i) => [
      { index: { _index: testData.ALERTS_INDEX, _id: `${runMarker}-${i}` } },
      doc,
    ]),
  });
  if (response.errors) {
    throw new Error(`Seeding rule alerts failed: ${JSON.stringify(response.items.slice(0, 3))}`);
  }
  return seeded;
};

/**
 * Runs one tuning sweep through the Worker: saving its settings installs the Worker's workflow,
 * and enabling it makes Task Manager run it once immediately as the bound service account. That
 * run is the sweep under test; the review of the seeded rule is a child workflow.
 */
const runTuningSweep = async (adminApi: AlertZeroApi): Promise<string> => {
  // An earlier test in this file leaves the Worker enabled; only a fresh enable runs it at once.
  await resetWorker(adminApi, WORKER_ID);
  const account = await createServiceAccount(adminApi);
  serviceAccountIds.push(account);
  const beforeSave = await getWorker(adminApi, WORKER_ID);
  await updateWorker(adminApi, WORKER_ID, {
    settingsRevision: beforeSave.settingsRevision ?? null,
    settings: { serviceAccountId: account },
  });
  const worker = await pollUntil(
    `worker ${WORKER_ID} to have a workflow installed`,
    async () => {
      const candidate = await getWorker(adminApi, WORKER_ID);
      return candidate.workflowId ? candidate : undefined;
    },
    { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
  );
  const workerWorkflowId = worker.workflowId;
  if (!workerWorkflowId) {
    throw new Error(`Worker ${WORKER_ID} has no workflow installed`);
  }
  const workflowBaselines = [
    [workerWorkflowId, await listExecutionIds(adminApi, workerWorkflowId)],
    [
      RULE_TUNING_REVIEW_WORKFLOW_ID,
      await listExecutionIds(adminApi, RULE_TUNING_REVIEW_WORKFLOW_ID),
    ],
  ] as const;
  const knownExecutionIds = workflowBaselines.flatMap(([, ids]) => ids);
  // Keep the FIRST baseline per workflow: a later sweep's snapshot must not absorb the execution
  // an earlier sweep started, or teardown would classify that run as pre-existing and leave it
  // uncanceled when the service account is deleted.
  for (const [workflowId, ids] of workflowBaselines) {
    if (!executionBaselines.has(workflowId)) {
      executionBaselines.set(workflowId, [...ids]);
    }
  }
  expect((await updateWorker(adminApi, WORKER_ID, { enabled: true })).enabled).toBe(true);
  const sweepExecutionId = await waitForNewExecution(
    adminApi,
    workerWorkflowId,
    knownExecutionIds,
    { timeoutMs: testData.ACTION_TIMEOUT_MS }
  );
  const sweep = await waitForExecution(
    adminApi,
    'the rule tuning sweep execution to finish',
    sweepExecutionId,
    { timeoutMs: testData.GENERATION_TIMEOUT_MS }
  );
  await assertExecutionCompleted(adminApi, 'The rule tuning sweep execution', sweep);
  return sweepExecutionId;
};

/**
 * Manual autonomy gates the diagnosis behind a "Review rule for tuning" entry proposal on the
 * rule's investigation. The proposal names the rule, and the run marker in that name keeps a
 * re-run from reading the entry proposal of an earlier run.
 */
const waitForEntryProposal = async (
  adminApi: AlertZeroApi,
  rule: SeededRule,
  since: string,
  sweepExecutionId: string
): Promise<TuningProposal> =>
  pollUntil(
    'the review-gate proposal for the seeded rule',
    async () =>
      (await listTuningProposals(adminApi)).find(
        (proposal) =>
          proposal.comment.includes(ENTRY_PROPOSAL_TITLE) &&
          proposal.comment.includes(rule.runMarker) &&
          proposal.createdAt >= since
      ),
    { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
  ).catch((error: unknown) => explainMissingTuningProposal(adminApi, error, sweepExecutionId));

/** The diagnosis then proposes the tuning itself: an exception (or an edit) on the rule. */
const waitForTuningProposal = async (
  adminApi: AlertZeroApi,
  rule: SeededRule,
  since: string,
  sweepExecutionId: string
): Promise<TuningProposal> =>
  pollUntil(
    'the tuning proposal for the seeded rule',
    async () =>
      (await listTuningProposals(adminApi)).find(
        (proposal) =>
          proposal.createdAt >= since &&
          !!proposal.actionInput &&
          actionTarget(proposal.actionInput) === rule.ruleId &&
          (proposal.actionWorkflowId === ADD_RULE_EXCEPTION_ACTION_ID ||
            proposal.actionWorkflowId === EDIT_RULE_ACTION_ID)
      ),
    { timeoutMs: testData.GENERATION_TIMEOUT_MS }
  ).catch((error: unknown) => explainMissingTuningProposal(adminApi, error, sweepExecutionId));

/** The rule's own exception items, read back from the exceptions API rather than the proposal. */
const readRuleExceptionItems = async (
  adminApi: AlertZeroApi,
  rule: SeededRule
): Promise<ExceptionItem[]> => {
  const persisted = ok(
    await adminApi.public<{
      exceptions_list?: Array<{ list_id: string; type: string; namespace_type: string }>;
    }>('GET', `/api/detection_engine/rules?id=${encodeURIComponent(rule.ruleId)}`),
    'read the tuned rule'
  );
  const defaultList = (persisted.exceptions_list ?? []).find(
    (list) => list.type === 'rule_default'
  );
  if (!defaultList) {
    return [];
  }
  return (
    ok(
      await adminApi.public<{ data?: ExceptionItem[] }>(
        'GET',
        `/api/exception_lists/items/_find?list_id=${encodeURIComponent(
          defaultList.list_id
        )}&namespace_type=${encodeURIComponent(defaultList.namespace_type)}&per_page=100`
      ),
      'read the rule exception items'
    ).data ?? []
  );
};

/**
 * The exception has to be on the rule's own default list and its persisted entries have to match
 * what the proposal claimed.
 */
const assertPersistedScopedException = async (
  adminApi: AlertZeroApi,
  rule: SeededRule
): Promise<void> => {
  const items = await pollUntil(
    'the proposed exception to be persisted on the rule',
    async () => {
      const found = (await readRuleExceptionItems(adminApi, rule)).filter((item) =>
        (item.entries ?? []).some((entry) => entryValues(entry).includes(FP_USER))
      );
      return found.length > 0 ? found : undefined;
    },
    { timeoutMs: testData.ACTION_TIMEOUT_MS }
  );
  const item = items[0];
  // Read through the rule's own `rule_default` list, so the item is rule-scoped by construction.
  assertScopedToFpPattern(item.entries ?? [], `the exception item on rule ${rule.ruleId}`);
};

const FP_RATE_SENTENCE = /Analysts closed (\d+) of (\d+) alerts \((\d+(?:\.\d+)?)%\)/;

/**
 * Seeds the noisy rule and drives the sweep through both gates — the review's entry proposal and
 * the tuning proposal itself — leaving the approved exception persisted on the rule. Both tests
 * that need a tuned rule run this, so each is self-sufficient: running either by title, or after
 * a red restarted the Playwright worker and cost the suite its module state, still exercises the
 * full flow instead of failing on a variable it can no longer read.
 */
const applyScopedExceptionToRule = async (
  adminApi: AlertZeroApi,
  esClient: EsClient
): Promise<SeededRule> => {
  const rule = await seedNoisyRule(adminApi, esClient);
  const startedAt = new Date().toISOString();
  const sweepExecutionId = await runTuningSweep(adminApi);

  const entryProposal = await waitForEntryProposal(adminApi, rule, startedAt, sweepExecutionId);
  investigationIds.add(entryProposal.conversationId);
  await approveTuningProposal(adminApi, entryProposal);

  const tuningProposal = await waitForTuningProposal(adminApi, rule, startedAt, sweepExecutionId);
  if (tuningProposal.actionWorkflowId !== ADD_RULE_EXCEPTION_ACTION_ID) {
    throw new Error(
      `the tuning proposed ${String(
        tuningProposal.actionWorkflowId
      )} instead of an exception: ${JSON.stringify(tuningProposal.actionInput)}`
    );
  }
  if (actionTarget(tuningProposal.actionInput) !== rule.ruleId) {
    throw new Error(
      `the tuning proposal targets ${String(
        actionTarget(tuningProposal.actionInput)
      )} instead of the seeded rule ${rule.ruleId}`
    );
  }
  assertScopedToFpPattern(
    readEntries(tuningProposal.actionInput, 'the tuning proposal'),
    'the tuning proposal'
  );

  investigationIds.add(tuningProposal.conversationId);
  await approveTuningProposal(adminApi, tuningProposal);
  await assertPersistedScopedException(adminApi, rule);
  return rule;
};

/**
 * security-team#19992: the review's own false-positive sentence has to render the rate rounded.
 * The counts are asserted alongside the rate, so a comment that dropped the sentence cannot pass
 * by accident, and the unrounded render (57.142857142857146%) is named in the failure.
 *
 * Fixed in d4993a212 (`| round` added to `compose_evidence.fp_summary`), which is in this
 * branch's base, so the assertion is a regression guard: removing that filter turns this red.
 */
const assertFpRateRendersRounded = (comment: string): void => {
  const match = FP_RATE_SENTENCE.exec(comment);
  if (!match) {
    throw new Error(
      `the entry proposal comment does not state the false-positive rate:\n${comment}`
    );
  }
  expect(match[1]).toBe(String(FP_COUNT));
  expect(match[2]).toBe(String(TOTAL_COUNT));
  const rate = match[3];
  const decimals = rate.includes('.') ? rate.split('.')[1].length : 0;
  if (decimals > 1) {
    throw new Error(
      `security-team#19992: the false-positive rate renders unrounded (${rate}%, expected ${FP_RATE_ROUNDED_TO_INTEGER}% or ${FP_RATE_ROUNDED_TO_ONE_DECIMAL}%):\n${comment}`
    );
  }
  expect([FP_RATE_ROUNDED_TO_INTEGER, FP_RATE_ROUNDED_TO_ONE_DECIMAL]).toContain(Number(rate));
};

const controlMarker = (rule: SeededRule): string => `alertzero-nc-${rule.runMarker}`;
const controlIndexName = (rule: SeededRule): string =>
  `alertzero-e2e-nc-${rule.runMarker}`.toLowerCase();

/**
 * Seeds the two events the control needs into an index of its own: the same false-positive
 * pattern the exception excludes, and a true positive from another user on the same host. Both
 * carry the run's marker in `process.name`, which is what the rule is pointed at below, so the
 * alerts the engine produces for them are distinguishable from the rule's seeded alert history.
 */
const seedControlEvents = async (
  esClient: EsClient,
  index: string,
  marker: string
): Promise<void> => {
  const event = (user: string) => ({
    '@timestamp': new Date().toISOString(),
    process: { name: marker },
    host: { name: FP_HOST },
    user: { name: user },
    // The same message the seeded alerts of this user carry: the tuning proposal is model-written
    // and may scope the exception on `message` too, so the control events have to look like the
    // seeded false positive and true positive, not like a third kind of event.
    message: user === FP_USER ? FP_MESSAGE : TP_MESSAGE,
  });
  // Keyword mappings: with dynamic text mappings `svc-backup` is analysed into two tokens and a
  // term filter on it would match nothing, which would make the control's ground truth lie.
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        host: { properties: { name: { type: 'keyword' } } },
        user: { properties: { name: { type: 'keyword' } } },
        process: { properties: { name: { type: 'keyword' } } },
      },
    },
  });
  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      { index: { _index: index, _id: `${marker}-tp` } },
      event(TP_USER),
      { index: { _index: index, _id: `${marker}-fp` } },
      event(FP_USER),
    ],
  });
  if (response.errors) {
    throw new Error(`Seeding control events failed: ${JSON.stringify(response.items.slice(0, 3))}`);
  }
};

/** Counts the control events the rule's query matches for one user: the control's ground truth. */
const countControlEvents = async (
  esClient: EsClient,
  index: string,
  marker: string,
  user: string
): Promise<number> => {
  const response = await esClient.count({
    index,
    query: {
      bool: {
        filter: [
          { term: { 'process.name': marker } },
          { term: { 'host.name': FP_HOST } },
          { term: { 'user.name': user } },
        ],
      },
    },
  });
  return response.count;
};

/**
 * Points the tuned rule at the control index: same rule, same exception, a query both control
 * events match. The rule is what has to keep alerting on the true positive, so only its own
 * execution can answer the control.
 */
const pointRuleAtControlIndex = async (
  adminApi: AlertZeroApi,
  rule: SeededRule,
  index: string,
  marker: string
): Promise<void> => {
  ok(
    await adminApi.public('PATCH', '/api/detection_engine/rules', {
      body: {
        id: rule.ruleId,
        index: [index],
        query: `process.name:"${marker}"`,
        interval: '1m',
        from: 'now-5m',
        enabled: true,
      },
    }),
    'point the tuned rule at the control index'
  );
};

const readControlAlerts = async (
  esClient: EsClient,
  rule: SeededRule,
  marker: string
): Promise<Array<Record<string, unknown>>> => {
  const response = await esClient.search<Record<string, unknown>>({
    index: testData.ALERTS_INDEX,
    size: 100,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.uuid': rule.ruleId } },
          { term: { 'process.name': marker } },
        ],
      },
    },
    _source: ['user', 'host', 'process', 'kibana.alert.rule.uuid', 'kibana.alert.rule.name'],
  });
  return response.hits.hits.map((hit) => hit._source ?? {});
};

const alertUserName = (alert: Record<string, unknown>): string | undefined => {
  const user = alert.user;
  if (user && typeof user === 'object' && 'name' in user) {
    const name = (user as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
};

/**
 * Every test here is LLM-dependent: the tuning worker refuses to turn on without an AI model, and
 * its diagnosis needs one. A stack booted without a chat-completion inference connector (plain CI:
 * the `alertzero` config set only wires one when a connector source exists) fails on the worker
 * enable with a 400, so each test skips with an explicit reason instead. Called before anything is
 * seeded, so a skipped test leaves nothing for teardown to undo.
 */
const skipWithoutChatConnector = async (adminApi: AlertZeroApi): Promise<void> => {
  const chatConnectors = await listChatCompletionConnectors(adminApi);
  apiTest.skip(
    chatConnectors.length === 0,
    'no preconfigured chat-completion inference connector on this stack; the LLM-dependent AlertZero rule-tuning flow requires one (agent_builder_smoke-style EIS connector source)'
  );
};

apiTest.describe('AlertZero e2e - rule tuning', { tag: [...tags.stateful.classic] }, () => {
  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    // The worker routes this suite drives are gated on the per-space AlertZero setting, which the
    // server config deliberately leaves writable (an override would make it read-only and break
    // the hunt suites' baseline writes). Enable it for this suite and restore the baseline in
    // teardown, so the next gated suite starts from the state this one found.
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    restoreAlertZero = await withAlertZeroEnabledInSpace({
      apiClient,
      headers: cookieHeader,
      spaceId: 'default',
    });
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const errors: unknown[] = [];
    const attempt = async (step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    };
    await attempt(async () => {
      api = await getAdminApi(apiClient, samlAuth);
    });
    // Stop new sweeps first: while the worker is enabled its schedule keeps starting runs, and a
    // sweep fired mid-teardown would raise another review that either outlives the drain below
    // or starts after it and survives the account deletion (in-flight runs execute as it).
    await attempt(async () => {
      if (api && (await getWorker(api, WORKER_ID)).enabled) {
        await updateWorker(api, WORKER_ID, { enabled: false });
      }
    });
    // Drain the sweep before the reviews it dispatches: a sweep that is still live when the
    // reviews are drained could start a fresh review right after. Map iteration is insertion
    // order, so sorting only moves the review workflow last when both were recorded.
    const drainOrder = [...executionBaselines.entries()].sort(
      ([a], [b]) =>
        Number(a === RULE_TUNING_REVIEW_WORKFLOW_ID) - Number(b === RULE_TUNING_REVIEW_WORKFLOW_ID)
    );
    for (const [workflowId, knownIds] of drainOrder) {
      await attempt(async () => {
        if (api) await cancelNewExecutions(api, workflowId, knownIds);
      });
    }
    // Settle what is only waiting for a human: dismissal releases the parked review behind each
    // pending proposal on its declined branch, and that run may still need the service account,
    // so this belongs before the account teardown. The conversations it returns are this run's
    // Investigations; they outlive the proposals and are deleted after the accounts.
    await attempt(async () => {
      if (api && seededRules.length > 0) {
        for (const conversationId of await dismissRunTuningProposals(api, seededRules)) {
          investigationIds.add(conversationId);
        }
      }
    });
    await attempt(async () => {
      if (api) await resetWorker(api, WORKER_ID);
    });
    for (const account of serviceAccountIds) {
      await attempt(async () => {
        if (api) await deleteServiceAccount(api, account);
      });
    }
    // Delete the Investigations behind this run's proposals only after the accounts: the
    // declined-branch runs that dismissal released may still be writing their final messages,
    // and they execute as the service accounts deleted just above.
    for (const investigationId of investigationIds) {
      await attempt(async () => {
        if (api) await deleteInvestigation(api, investigationId);
      });
    }
    // Restore the per-space AlertZero gate this suite enabled (see beforeAll). Best-effort: the
    // gated routes' users are all settled by now.
    await attempt(async () => {
      await restoreAlertZero?.();
    });
    await attempt(async () => {
      if (esClientRef && controlIndex) {
        await esClientRef.indices
          .delete({ index: controlIndex }, { ignore: [404] })
          .catch(() => undefined);
      }
    });
    for (const rule of seededRules) {
      await attempt(async () => {
        if (api) {
          // A 404 means an earlier teardown already removed it; anything else fails loudly —
          // `api.public` resolves HTTP failures as values, so discarding the response would
          // make a failed delete look successful and leak the rule, which the control
          // explicitly enabled, so it would keep firing on the shared stack.
          const response = await api.public(
            'DELETE',
            `/api/detection_engine/rules?id=${encodeURIComponent(rule.ruleId)}`
          );
          if (response.statusCode !== 200 && response.statusCode !== 404) {
            throw new Error(
              `delete rule ${rule.ruleId} failed: ${response.statusCode} ${JSON.stringify(
                response.body
              )}`
            );
          }
        }
      });
    }
    await attempt(async () => {
      if (esClientRef) {
        // By rule uuid covers both the hand-written seeds and any alert the engine generated.
        for (const rule of seededRules) {
          await esClientRef.deleteByQuery({
            index: testData.ALERTS_INDEX,
            conflicts: 'proceed',
            refresh: true,
            query: { term: { 'kibana.alert.rule.uuid': rule.ruleId } },
          });
        }
      }
    });
    if (errors.length > 0) {
      throw new Error(
        `AlertZero e2e cleanup failed: ${errors
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .join('; ')}`
      );
    }
  });

  apiTest(
    'tunes a noisy rule with an exception scoped to the FP pattern',
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(
        testData.GENERATION_TIMEOUT_MS +
          2 * testData.PROPOSAL_TIMEOUT_MS +
          testData.ACTION_TIMEOUT_MS
      );
      const adminApi = await getAdminApi(apiClient, samlAuth);
      api = adminApi;
      esClientRef = esClient;
      await skipWithoutChatConnector(adminApi);

      const rule = await applyScopedExceptionToRule(adminApi, esClient);
      tunedRule = rule;
    }
  );

  apiTest(
    'keeps alerting on a true positive from another user after the tuning',
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(
        testData.GENERATION_TIMEOUT_MS +
          2 * testData.PROPOSAL_TIMEOUT_MS +
          2 * testData.ACTION_TIMEOUT_MS
      );
      const adminApi = await getAdminApi(apiClient, samlAuth);
      api = adminApi;
      esClientRef = esClient;
      await skipWithoutChatConnector(adminApi);

      // Self-sufficient by design: the control needs a rule with the exception applied, and it
      // gets it the same way the first test does instead of reading module state that a red
      // between the two (which restarts the Playwright worker) wipes. When the tuning test ran
      // first in this worker its rule is reused, so the shared-space cost is one extra sweep.
      const rule = tunedRule ?? (await applyScopedExceptionToRule(adminApi, esClient));
      const marker = controlMarker(rule);
      const index = controlIndexName(rule);
      controlIndex = index;

      await seedControlEvents(esClient, index, marker);
      for (const user of [TP_USER, FP_USER]) {
        const found = await countControlEvents(esClient, index, marker, user);
        if (found !== 1) {
          throw new Error(
            `the ${user} control event is not in ${index} (found ${found}), so "no alert" for it would prove nothing`
          );
        }
      }

      await pointRuleAtControlIndex(adminApi, rule, index, marker);
      const truePositiveAlerts = await pollUntil(
        `an alert for the ${TP_USER} true positive the exception must not cover`,
        async () => {
          const alerts = (await readControlAlerts(esClient, rule, marker)).filter(
            (alert) => alertUserName(alert) === TP_USER
          );
          return alerts.length > 0 ? alerts : undefined;
        },
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      expect(truePositiveAlerts.length).toBeGreaterThan(0);

      const alerts = await readControlAlerts(esClient, rule, marker);
      const fromFpUser = alerts.filter((alert) => alertUserName(alert) === FP_USER);
      if (fromFpUser.length > 0) {
        const persisted = (await readRuleExceptionItems(adminApi, rule)).map(
          (item) => item.entries
        );
        throw new Error(
          `the exception did not exclude the ${FP_USER} false positive on ${FP_HOST}: ${JSON.stringify(
            fromFpUser.slice(0, 3)
          )}; persisted exception entries: ${JSON.stringify(persisted)}`
        );
      }
    }
  );

  // Last on purpose: it seeds and sweeps on its own, so a red here (which restarts the Playwright
  // worker) cannot take the control above down with it, which needs the first test's module state.
  // security-team#19992, fixed in d4993a212: the review's rate used to render the raw float
  // (57.142857142857146%). The test seeds and sweeps on its own, so a worker restart after a red
  // test above does not break it, and it stops before the diagnosis: reading the entry proposal's
  // own text costs no model call.
  apiTest(
    'renders the false-positive rate rounded (security-team#19992)',
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(testData.PROPOSAL_TIMEOUT_MS + 2 * testData.ACTION_TIMEOUT_MS);
      const adminApi = await getAdminApi(apiClient, samlAuth);
      api = adminApi;
      esClientRef = esClient;
      await skipWithoutChatConnector(adminApi);

      const rule = await seedNoisyRule(adminApi, esClient);
      const startedAt = new Date().toISOString();
      const sweepExecutionId = await runTuningSweep(adminApi);
      const entryProposal = await waitForEntryProposal(adminApi, rule, startedAt, sweepExecutionId);

      assertFpRateRendersRounded(entryProposal.comment);

      // Settling the review is what closes it without a diagnosis: declining marks its alerts
      // reviewed and ends the run, so no model call and no second proposal is left behind.
      investigationIds.add(entryProposal.conversationId);
      await dismissTuningProposal(adminApi, entryProposal);
    }
  );
});
