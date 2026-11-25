/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture, EsClient } from '@kbn/scout-security';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  buildServiceAccountUrl,
  buildWorkerUrl,
  getWorkerRoleName,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
} from '@kbn/alertzero-common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { spaceUrl } from './helpers';
import { findStepOutput } from './workflow_runs';

// Inlined: Playwright's esbuild cannot load the managed YAML behind @kbn/workflows/managed.
export const RULE_TUNING_REVIEW_WORKFLOW_ID = 'system-security-rule-tuning-review';
export const APPLIED_TAG = 'detection-watch:tuning-applied';
export const DISMISSED_TAG = 'detection-watch:tuning-dismissed';

const RULE_HEADERS = { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };
const INTERNAL_V1_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};
const SEARCH_INFERENCE_SETTINGS_PATH = 'internal/search_inference_endpoints/settings';
/** The worker's default minimum is 10 false positives at a 50% rate. */
export const FP_ALERT_COUNT = 10;
/** The process of the false positives. The true positives run another one. */
export const FP_PROCESS_NAME = 'nginx';
const TP_PROCESS_NAME = 'ncat';
export const TP_EVENT_COUNT = 2;
/**
 * How long before the test the seeded history happened. The rule looks back 6 minutes, so its
 * own runs never alert on these events, while the backtest, which ends at the newest false
 * positive, replays them.
 */
const HISTORY_AGE_MS = 2 * 60 * 60_000;
const HISTORY_SPACING_MS = 20_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const expectStatus = (
  what: string,
  { statusCode, body }: { statusCode: number; body: unknown },
  accepted: number[] = [200]
): void => {
  if (!accepted.includes(statusCode)) {
    throw new Error(`${what}: status ${statusCode} ${JSON.stringify(body)}`);
  }
};

/** Polls `read` until it returns a value, or throws with `what` after `timeoutMs`. */
export const pollFor = async <T>(
  what: string,
  read: () => Promise<T | undefined>,
  { timeoutMs, intervalMs = 2_000 }: { timeoutMs: number; intervalMs?: number }
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (value !== undefined) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}`);
    }
    await sleep(intervalMs);
  }
};

interface RuleTuningSpaceArgs {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}

/**
 * Creates a `.gen-ai` connector to the LLM proxy in the space and pins the AlertZero features
 * to it, so the review's `diagnose_rule` step runs on the scripted model.
 */
export const pinModelToProxy = async ({
  apiClient,
  headers,
  spaceId,
  proxyPort,
}: RuleTuningSpaceArgs & { proxyPort: number }): Promise<string> => {
  const connector = await apiClient.post(spaceUrl('api/actions/connector', spaceId), {
    headers,
    responseType: 'json',
    body: {
      name: `scout-rule-tuning-proxy-${spaceId}`,
      connector_type_id: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxyPort}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'scout-test-key' },
    },
  });
  expectStatus('Create the proxy connector', connector);
  const { id: connectorId } = connector.body as { id: string };

  const settingsUrl = spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId);
  const current = await apiClient.get(settingsUrl, {
    headers: { ...headers, ...INTERNAL_V1_HEADERS },
    responseType: 'json',
  });
  expectStatus('Read the inference settings', current);
  const pinned = new Set<string>([
    ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
    ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ]);
  const features = (
    (current.body as { data?: { features?: Array<{ feature_id: string }> } }).data?.features ?? []
  ).filter(({ feature_id: featureId }) => !pinned.has(featureId));
  const put = await apiClient.put(settingsUrl, {
    headers: { ...headers, ...INTERNAL_V1_HEADERS },
    responseType: 'json',
    body: {
      features: [
        ...features,
        ...[...pinned].map((featureId) => ({
          feature_id: featureId,
          endpoints: [{ id: connectorId }],
        })),
      ],
    },
  });
  expectStatus('Pin the AlertZero features to the proxy connector', put);
  return connectorId;
};

/** Creates a service account with the rule tuning worker's built-in role. */
export const createWorkerServiceAccount = async ({
  apiClient,
  headers,
  spaceId,
}: RuleTuningSpaceArgs): Promise<string> => {
  const accountName = WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID];
  const created = await apiClient.post(SECURITY_SERVICE_ACCOUNT_URL, {
    headers: { ...headers, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' },
    responseType: 'json',
    body: {
      // Unique, so a run never collides with an account that a failed run left behind.
      name: `${accountName}_scout_${randomUUID().slice(0, 8)}`.slice(0, 50),
      description: `Scout rule tuning review (${spaceId})`,
      roles: [getWorkerRoleName(accountName, { isServerless: false })],
    },
  });
  expectStatus('Create the worker service account', created);
  return (created.body as { id: string }).id;
};

export const deleteServiceAccount = async ({
  apiClient,
  headers,
  serviceAccountId,
}: Omit<RuleTuningSpaceArgs, 'spaceId'> & { serviceAccountId: string }): Promise<void> => {
  const deleted = await apiClient.delete(`${buildServiceAccountUrl(serviceAccountId)}?force=true`, {
    headers: { ...headers, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' },
    responseType: 'json',
  });
  expectStatus('Delete the worker service account', deleted, [200, 204, 404]);
};

/**
 * Enables the rule tuning worker in the space, running as the service account. Enabling
 * schedules the worker, and its first run starts at once.
 */
export const setRuleTuningWorker = async ({
  apiClient,
  headers,
  spaceId,
  enabled,
  settings,
}: RuleTuningSpaceArgs & {
  enabled: boolean;
  settings?: { serviceAccountId: string; autonomy: 'manual' | 'assisted' };
}): Promise<void> => {
  const listed = await apiClient.get(spaceUrl(ALERTZERO_WORKERS_URL, spaceId), {
    headers: { ...headers, ...INTERNAL_V1_HEADERS },
    responseType: 'json',
  });
  expectStatus('List the workers', listed);
  const worker = (
    listed.body as { workers: Array<{ id: string; settingsRevision: number | null }> }
  ).workers.find(({ id }) => id === SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID);
  const patched = await apiClient.patch(
    spaceUrl(buildWorkerUrl(SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID), spaceId),
    {
      headers: { ...headers, ...INTERNAL_V1_HEADERS },
      responseType: 'json',
      body: {
        enabled,
        ...(settings ? { settings, settingsRevision: worker?.settingsRevision ?? null } : {}),
      },
    }
  );
  expectStatus(`${enabled ? 'Enable' : 'Disable'} the rule tuning worker`, patched);
};

export interface SeededRule {
  /** Saved-object id. The review reads the rule by it. */
  id: string;
  ruleId: string;
  /** The data stream that holds the rule's source events. */
  eventsIndex: string;
}

/** Total source events: one per false positive, plus the true positives. */
export const SEEDED_EVENT_COUNT = FP_ALERT_COUNT + TP_EVENT_COUNT;

/**
 * Creates an enabled query rule and the history the worker looks for: `FP_ALERT_COUNT` source
 * events of `FP_PROCESS_NAME`, each with an alert that analysts closed as a false positive, and
 * `TP_EVENT_COUNT` events of `TP_PROCESS_NAME` that a good tuning change must keep alerting on.
 * The true positives have no alerts, so the worker sees a 100% false positive rate.
 *
 * The alerts are written only after the rule's first run has installed the space's alerts alias.
 * A write to that name before the install makes ES create a plain, dynamically mapped index, and
 * the sweep's query then fails on fields that index never mapped.
 */
export const seedRuleWithFalsePositives = async ({
  apiClient,
  headers,
  spaceId,
  esClient,
  name,
  query,
}: RuleTuningSpaceArgs & {
  esClient: EsClient;
  name: string;
  query: string;
}): Promise<SeededRule> => {
  const ruleId = `${name}-rule`;
  // Matches the `logs-*-*` template, so ES creates a data stream with ECS mappings, and the
  // worker's role can read `logs-*`.
  const eventsIndex = `logs-${name}-events`;
  const created = await apiClient.post(spaceUrl('api/detection_engine/rules', spaceId), {
    headers: { ...headers, ...RULE_HEADERS },
    responseType: 'json',
    body: {
      rule_id: ruleId,
      name,
      description: `Scout rule tuning review rule ${name}.`,
      type: 'query',
      language: 'kuery',
      query,
      index: [eventsIndex],
      severity: 'medium',
      risk_score: 40,
      interval: '5m',
      from: 'now-6m',
      enabled: true,
    },
  });
  expectStatus(`Create rule ${name}`, created);
  await pollFor(
    `the alerts alias of space ${spaceId}`,
    async () =>
      (await esClient.indices.existsAlias({ name: `.alerts-security.alerts-${spaceId}` }))
        ? true
        : undefined,
    { timeoutMs: 120_000, intervalMs: 1_000 }
  );
  const { id, revision } = created.body as { id: string; revision: number };

  // Every event sits a few seconds before its alert, and all of them inside one rule interval
  // before the newest false positive, so the backtest's last run covers each event once.
  const newestAlertAt = Date.now() - HISTORY_AGE_MS;
  const eventAt = (i: number): string =>
    new Date(newestAlertAt - i * HISTORY_SPACING_MS - 5_000).toISOString();
  const events = Array.from({ length: SEEDED_EVENT_COUNT }, (_, i) => {
    const isFalsePositive = i < FP_ALERT_COUNT;
    return [
      { create: {} },
      {
        '@timestamp': eventAt(i),
        'event.kind': 'event',
        'event.category': ['process'],
        'event.type': ['start'],
        'host.name': isFalsePositive ? `web-${i}` : `db-${i}`,
        'user.name': `svc_${i}`,
        'process.name': isFalsePositive ? FP_PROCESS_NAME : TP_PROCESS_NAME,
      },
    ];
  }).flat();
  const eventsBulk = await esClient.bulk({
    index: eventsIndex,
    refresh: 'wait_for',
    operations: events,
  });
  if (eventsBulk.errors) {
    const failed = eventsBulk.items.filter((item) => item.create?.error).slice(0, 3);
    throw new Error(`Seeding the source events failed: ${JSON.stringify(failed)}`);
  }

  const operations = Array.from({ length: FP_ALERT_COUNT }, (_, i) => {
    const uuid = randomUUID();
    const timestamp = new Date(newestAlertAt - i * HISTORY_SPACING_MS).toISOString();
    return [
      { create: { _id: uuid } },
      {
        '@timestamp': timestamp,
        'event.kind': 'signal',
        'kibana.space_ids': [spaceId],
        'kibana.alert.uuid': uuid,
        'kibana.alert.start': timestamp,
        'kibana.alert.rule.uuid': id,
        'kibana.alert.rule.rule_id': ruleId,
        'kibana.alert.rule.name': name,
        'kibana.alert.rule.revision': revision,
        'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'closed',
        'kibana.alert.workflow_reason': 'false_positive',
        'kibana.alert.workflow_tags': [],
        'kibana.alert.severity': 'medium',
        'kibana.alert.risk_score': 40,
        'host.name': `web-${i}`,
        'user.name': `svc_${i}`,
        'process.name': FP_PROCESS_NAME,
      },
    ];
  }).flat();
  const bulk = await esClient.bulk({
    index: `.alerts-security.alerts-${spaceId}`,
    refresh: 'wait_for',
    operations,
  });
  if (bulk.errors) {
    const failed = bulk.items.filter((item) => item.create?.error).slice(0, 3);
    throw new Error(`Seeding the false positives failed: ${JSON.stringify(failed)}`);
  }
  return { id, ruleId, eventsIndex };
};

/** What the review's backtest counted, from its `record_preview_outcome` step. */
export interface BacktestOutcome {
  current_succeeded: boolean;
  current_alert_count: number;
  proposed_succeeded: boolean;
  proposed_alert_count: number;
}

/** The backtest result of the review, or undefined when the review never ran one. */
export const readBacktest = (review: WorkflowExecutionDto): BacktestOutcome | undefined =>
  findStepOutput(review, 'record_preview_outcome') as BacktestOutcome | undefined;

export interface RuleState {
  query: string;
  risk_score: number;
  severity: string;
  exceptions_list: Array<{ list_id: string; namespace_type: string; type: string }>;
}

export const readRule = async ({
  apiClient,
  headers,
  spaceId,
  id,
}: RuleTuningSpaceArgs & { id: string }): Promise<RuleState> => {
  const response = await apiClient.get(
    spaceUrl(`api/detection_engine/rules?id=${encodeURIComponent(id)}`, spaceId),
    { headers: { ...headers, ...RULE_HEADERS }, responseType: 'json' }
  );
  expectStatus(`Read rule ${id}`, response);
  return response.body as RuleState;
};

export interface ExceptionItem {
  name: string;
  entries: Array<{ field: string; operator: string; type: string; value?: string }>;
}

/** The items of the rule's own exception list. A rule with no such list has none. */
export const readRuleExceptionItems = async ({
  apiClient,
  headers,
  spaceId,
  rule,
}: RuleTuningSpaceArgs & { rule: RuleState }): Promise<ExceptionItem[]> => {
  const list = rule.exceptions_list.find(({ type }) => type === 'rule_default');
  if (!list) {
    return [];
  }
  const response = await apiClient.get(
    spaceUrl(
      `api/exception_lists/items/_find?list_id=${encodeURIComponent(list.list_id)}&namespace_type=${
        list.namespace_type
      }`,
      spaceId
    ),
    { headers: { ...headers, ...RULE_HEADERS }, responseType: 'json' }
  );
  expectStatus(`Read the exception items of list ${list.list_id}`, response);
  return (response.body as { data: ExceptionItem[] }).data;
};

/** Workflow tags of the rule's alerts, one array per alert. */
export const readAlertTags = async ({
  esClient,
  spaceId,
  ruleId,
}: {
  esClient: EsClient;
  spaceId: string;
  ruleId: string;
}): Promise<string[][]> => {
  const response = await esClient.search<{ 'kibana.alert.workflow_tags'?: string[] }>({
    index: `.alerts-security.alerts-${spaceId}`,
    size: FP_ALERT_COUNT,
    query: { term: { 'kibana.alert.rule.rule_id': ruleId } },
  });
  return response.hits.hits.map(({ _source }) => _source?.['kibana.alert.workflow_tags'] ?? []);
};

const getExecution = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
}: RuleTuningSpaceArgs & { executionId: string }): Promise<WorkflowExecutionDto> => {
  const response = await apiClient.get(
    spaceUrl(`api/workflows/executions/${executionId}?includeOutput=true`, spaceId),
    { headers, responseType: 'json' }
  );
  expectStatus(`Read execution ${executionId}`, response);
  return response.body as WorkflowExecutionDto;
};

/**
 * The review the worker started in the space. The space holds one rule, so the worker starts
 * one review.
 */
export const waitForReviewExecution = ({
  apiClient,
  headers,
  spaceId,
  timeoutMs,
}: RuleTuningSpaceArgs & { timeoutMs: number }): Promise<string> =>
  pollFor(
    'the worker to start a rule tuning review',
    async () => {
      const response = await apiClient.get(
        spaceUrl(`api/workflows/workflow/${RULE_TUNING_REVIEW_WORKFLOW_ID}/executions`, spaceId),
        { headers, responseType: 'json' }
      );
      expectStatus('List the review executions', response);
      const [review] = (response.body as { results?: Array<{ id: string }> }).results ?? [];
      return review?.id;
    },
    { timeoutMs }
  );

/** The id of the investigation conversation the review opened. */
export const waitForInvestigation = ({
  apiClient,
  headers,
  spaceId,
  executionId,
  timeoutMs,
}: RuleTuningSpaceArgs & { executionId: string; timeoutMs: number }): Promise<string> =>
  pollFor(
    `review ${executionId} to open its investigation`,
    async () => {
      const execution = await getExecution({ apiClient, headers, spaceId, executionId });
      if (isTerminalStatus(execution.status)) {
        throw new Error(
          `Review ${executionId} ended ${
            execution.status
          } before it opened an investigation: ${JSON.stringify(execution.error)}`
        );
      }
      const output = execution.stepExecutions.find(
        ({ stepId, output: stepOutput }) => stepId === 'create_investigation' && stepOutput != null
      )?.output as { conversation_id?: string } | undefined;
      return output?.conversation_id;
    },
    { timeoutMs }
  );

/**
 * Approves or dismisses the pending proposal of the investigation, the same way the analyst's
 * buttons do, and returns its id. A proposal can be listed before its gate has parked, and the
 * route answers 409 until it has, so a 409 is retried.
 *
 * In manual mode the entry proposal and the tuning proposal share the investigation, and a
 * decided proposal can still list as pending for a moment, so `decidedIds` are skipped.
 */
export const decidePendingProposal = ({
  apiClient,
  headers,
  spaceId,
  conversationId,
  decision,
  decidedIds = [],
  timeoutMs,
}: RuleTuningSpaceArgs & {
  conversationId: string;
  decision: 'approve' | 'dismiss';
  decidedIds?: string[];
  timeoutMs: number;
}): Promise<string> =>
  pollFor(
    `a pending proposal in conversation ${conversationId} to ${decision}`,
    async () => {
      const listed = await apiClient.get(
        spaceUrl(
          `internal/proposals?conversationId=${encodeURIComponent(conversationId)}&status=pending`,
          spaceId
        ),
        { headers: { ...headers, ...INTERNAL_V1_HEADERS }, responseType: 'json' }
      );
      expectStatus('List the pending proposals', listed);
      const proposal = (listed.body as { proposals: Array<{ id: string }> }).proposals.find(
        ({ id }) => !decidedIds.includes(id)
      );
      if (!proposal) {
        return undefined;
      }
      const decided = await apiClient.post(
        spaceUrl(`internal/proposals/${encodeURIComponent(proposal.id)}/${decision}`, spaceId),
        {
          headers: { ...headers, ...INTERNAL_V1_HEADERS },
          responseType: 'json',
          body: decision === 'approve' ? {} : { dismissReason: 'no_reason' },
        }
      );
      if (decided.statusCode === 409) {
        return undefined;
      }
      expectStatus(`${decision} proposal ${proposal.id}`, decided);
      return proposal.id;
    },
    { timeoutMs }
  );

export const waitForReviewEnd = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
  timeoutMs,
}: RuleTuningSpaceArgs & {
  executionId: string;
  timeoutMs: number;
}): Promise<WorkflowExecutionDto> =>
  pollFor(
    `review ${executionId} to end`,
    async () => {
      const execution = await getExecution({ apiClient, headers, spaceId, executionId });
      return isTerminalStatus(execution.status) ? execution : undefined;
    },
    { timeoutMs }
  );

export const cancelExecution = async ({
  apiClient,
  headers,
  spaceId,
  executionId,
}: RuleTuningSpaceArgs & { executionId: string }): Promise<void> => {
  await apiClient.post(spaceUrl(`api/workflows/executions/${executionId}/cancel`, spaceId), {
    headers,
  });
};
