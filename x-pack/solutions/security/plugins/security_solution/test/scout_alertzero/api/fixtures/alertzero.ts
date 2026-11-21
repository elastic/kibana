/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import type { ListProposalsResponse } from '@kbn/proposals-common';
import type { EsClient } from '@kbn/scout-security';
import {
  AD2_ALERTS_INDEX,
  AD2_SCENARIO_ALL_INDICES,
  buildAd2SeedPlan,
  getAd2ScenarioAlertIds,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import type {
  Ad2IndexedAlert,
  Ad2IndexedRawEvent,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import { ALERTZERO_INFERENCE_PARENT_FEATURE_ID } from '@kbn/alertzero-common';
import { ATTACK_SCENARIO_KEY, BASELINE_TIMEOUT_MS, DRAIN_TIMEOUT_MS } from './constants';
import { ok, pollUntil } from './kbn';
import type { AlertZeroApi } from './kbn';

const WORKERS_URL = '/internal/alertzero/workers';
const SERVICE_ACCOUNT_URL = '/internal/security/service_account';

export interface SeededScenario {
  readonly runMarker: string;
  readonly alertIds: readonly string[];
  /**
   * Run-owned host and user names the seeded scenario was rewritten to (see
   * `seedAttackScenario`): teardown discovers this run's Investigations by them.
   */
  readonly entityNames: readonly string[];
  readonly cleanup: () => Promise<void>;
}

/**
 * Rewrites every host and user name in the plan to one owned by this run: `<name>-<runMarker>`.
 * Attack Discovery fingerprint matching correlates attacks by host/user names within a 24h
 * window, so scenario-canonical names are shared by every run that seeds the same scenario in
 * the shared space — a previous run's investigation can absorb this run's attack and its
 * teardown then misses it. Document ids need no rewrite: they already derive from the run
 * marker. The rewrite is a plain substring replacement over the serialized documents, so the
 * names also disappear from messages, command lines and file paths that spell them out. It is a
 * single pass with longer names tried first, so a name that prefixes or is contained in another
 * is never half-rewritten.
 */
const runOwnEntityNames = (
  docs: ReadonlyArray<Ad2IndexedAlert | Ad2IndexedRawEvent>,
  runMarker: string
): { docs: Array<Ad2IndexedAlert | Ad2IndexedRawEvent>; entityNames: readonly string[] } => {
  const names = new Set<string>();
  for (const doc of docs) {
    const source = doc.source as {
      host?: { name?: unknown; hostname?: unknown };
      user?: { name?: unknown };
    };
    for (const value of [source.host?.name, source.host?.hostname, source.user?.name]) {
      if (typeof value === 'string' && value.length > 0) {
        names.add(value);
      }
    }
  }
  const replacements = [...names]
    .map((name) => [name, `${name}-${runMarker}`] as const)
    .sort(([a], [b]) => b.length - a.length);
  if (replacements.length === 0) {
    return { docs: [...docs], entityNames: [] };
  }
  const runOwnedByName = new Map<string, string>(replacements);
  // One pass over an alternation ordered longest-first: each match is replaced once and the
  // output is never rescanned, so a name inside an already rewritten name is left alone.
  const pattern = new RegExp(
    replacements.map(([name]) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'g'
  );
  const rewritten = docs.map((doc) => ({
    ...doc,
    source: JSON.parse(
      JSON.stringify(doc.source).replace(pattern, (name) => runOwnedByName.get(name) ?? name)
    ),
  }));
  return { docs: rewritten, entityNames: replacements.map(([, runOwned]) => runOwned) };
};

export const seedAttackScenario = async (
  esClient: EsClient,
  api: AlertZeroApi,
  {
    scenarioKey = ATTACK_SCENARIO_KEY,
    agentIdByHost,
  }: { scenarioKey?: string; agentIdByHost?: Readonly<Record<string, string>> } = {}
): Promise<SeededScenario> => {
  const runMarker = `alertzero-e2e-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const plan = buildAd2SeedPlan({ scenarioKey, runMarker, baseTime: new Date(), agentIdByHost });
  const { docs: scenarioDocs, entityNames } = runOwnEntityNames(
    [...plan.alerts, ...plan.rawEvents],
    runMarker
  );
  const alerts = scenarioDocs.filter((doc): doc is Ad2IndexedAlert =>
    plan.alerts.some((alert) => alert.id === doc.id)
  );
  const rawEvents = scenarioDocs.filter((doc): doc is Ad2IndexedRawEvent =>
    plan.rawEvents.some((event) => event.id === doc.id)
  );

  // Creates the alerts index + mappings the seeded alerts are written into.
  ok(await api.public('POST', '/api/detection_engine/index'), 'create the detection alerts index');

  const bulk = async (
    docs: ReadonlyArray<{ id: string; index?: string; source: object }>,
    op: 'index' | 'create'
  ) => {
    if (docs.length === 0) {
      return;
    }
    const response = await esClient.bulk({
      refresh: 'wait_for',
      operations: docs.flatMap((doc) => [
        { [op]: { _index: doc.index ?? AD2_ALERTS_INDEX, _id: doc.id } },
        doc.source,
      ]),
    });
    if (response.errors) {
      throw new Error(`Seeding (${op}) failed: ${JSON.stringify(response.items.slice(0, 3))}`);
    }
  };
  // Removes only what this run wrote, keyed on the plan's document ids (run-scoped digests).
  // Not on `labels.ad_portable_seed`: an index may not map it, depending on its template.
  // Shared by the failure rollback below and the returned cleanup so a partially seeded run
  // cannot leak documents.
  const seededIds = [...plan.alerts, ...plan.rawEvents].map((doc) => doc.id);
  const removeSeeded = async (): Promise<void> => {
    for (const index of AD2_SCENARIO_ALL_INDICES) {
      await esClient
        .deleteByQuery({
          index,
          conflicts: 'proceed',
          refresh: true,
          query: { ids: { values: seededIds } },
        })
        .catch((error: { statusCode?: number }) => {
          if (error.statusCode !== 404) {
            throw error;
          }
        });
    }
  };

  try {
    await bulk(alerts, 'index');
    // Raw endpoint events live in data streams, which only accept `create`.
    await bulk(rawEvents, 'create');
  } catch (error) {
    // A failed bulk can still have written some documents (the raw-events bulk can fail after
    // every alert already landed). Throwing here without a rollback would leave this function's
    // cleanup callback unreachable — the caller never receives `scenario`, so its afterAll
    // cannot remove the leftovers, and they can pollute later Attack Discovery runs.
    await removeSeeded().catch(() => undefined); // best-effort; the seeding error is the real one
    throw error;
  }

  return {
    runMarker,
    alertIds: getAd2ScenarioAlertIds(scenarioKey, 'clean', runMarker),
    entityNames,
    cleanup: removeSeeded,
  };
};

export interface WorkerRecord {
  id: string;
  enabled: boolean;
  workflowId?: string;
  settingsRevision?: number | null;
  settings: { autonomy: string; serviceAccountId?: string };
  blockingReasons?: string[];
  /** `'unavailable'`: the stored settings could not be read, so `settings` holds defaults. */
  state?: string;
}

export const listWorkers = async (
  api: AlertZeroApi,
  options?: { signal?: AbortSignal }
): Promise<WorkerRecord[]> =>
  ok(
    await api.internal<{ workers: WorkerRecord[] }>('GET', WORKERS_URL, {
      signal: options?.signal,
    }),
    'list workers'
  ).workers;

export const getWorker = async (
  api: AlertZeroApi,
  workerId: string,
  options?: { signal?: AbortSignal }
): Promise<WorkerRecord> => {
  const worker = (await listWorkers(api, options)).find((candidate) => candidate.id === workerId);
  if (!worker) {
    throw new Error(`Worker ${workerId} is not in the catalog`);
  }
  return worker;
};

export const patchWorker = (api: AlertZeroApi, workerId: string, body: Record<string, unknown>) =>
  api.internal<{ worker: WorkerRecord }>(
    'PATCH',
    `${WORKERS_URL}/${encodeURIComponent(workerId)}`,
    {
      body,
    }
  );

export const updateWorker = async (
  api: AlertZeroApi,
  workerId: string,
  body: Record<string, unknown>
): Promise<WorkerRecord> =>
  ok(await patchWorker(api, workerId, body), `update worker ${workerId}`).worker;

export const createServiceAccount = async (api: AlertZeroApi): Promise<string> =>
  ok(
    await api.internal<{ id: string }>('POST', SERVICE_ACCOUNT_URL, {
      body: { name: `alertzero-e2e-${Date.now()}`, roles: ['superuser'] },
    }),
    'create service account'
  ).id;

export const deleteServiceAccount = async (api: AlertZeroApi, id: string): Promise<void> => {
  const response = await api.internal('DELETE', `${SERVICE_ACCOUNT_URL}/${encodeURIComponent(id)}`);
  // `api.internal` resolves non-2xx responses as values instead of throwing, so discarding the
  // result would make teardown look successful while leaving the superuser account behind.
  // A 404 means an earlier teardown already removed it; anything else fails loudly.
  if (response.statusCode !== 200 && response.statusCode !== 404) {
    throw new Error(
      `Delete service account ${id} failed: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
};

/**
 * Returns a worker to its pre-test state: disabled, with no service account bound. The order
 * matters, because a save that leaves an enabled worker without an account is rejected. Safe to
 * call on a worker that is already clean, and throws if the worker is still dirty afterwards.
 */
export const resetWorker = async (api: AlertZeroApi, workerId: string): Promise<void> => {
  const worker = await getWorker(api, workerId);
  if (worker.enabled) {
    ok(await patchWorker(api, workerId, { enabled: false }), `disable worker ${workerId}`);
  }
  if (worker.settings.serviceAccountId !== undefined) {
    const current = await getWorker(api, workerId);
    ok(
      await patchWorker(api, workerId, {
        settingsRevision: current.settingsRevision ?? null,
        settings: { serviceAccountId: null },
      }),
      `clear the service account of worker ${workerId}`
    );
  }
  const after = await getWorker(api, workerId);
  if (after.enabled || after.settings.serviceAccountId !== undefined) {
    throw new Error(
      `Worker ${workerId} was not reset: enabled=${after.enabled} serviceAccountId=${String(
        after.settings.serviceAccountId
      )}`
    );
  }
};

const INFERENCE_SETTINGS_URL = '/internal/search_inference_endpoints/settings';

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string; parameters?: Record<string, unknown> }>;
}

/**
 * Makes the space resolve an AI model without a real one, for specs that need the worker enable
 * gate passed but never call a model: a placeholder `.gen-ai` connector (no pre-save hook, so it
 * creates on a connector-free stack) assigned to the AlertZero parent inference feature. An
 * existing parent assignment is kept. The returned callback restores the original assignments
 * and deletes the connector.
 */
export const withPlaceholderModel = async (api: AlertZeroApi): Promise<() => Promise<void>> => {
  const { id: connectorId } = ok(
    await api.public<{ id: string }>('POST', '/api/actions/connector', {
      body: {
        name: `scout-alertzero-placeholder-${Date.now()}`,
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: 'https://example.invalid/v1',
          defaultModel: 'gpt-4',
        },
        secrets: { apiKey: 'scout-placeholder' },
      },
    }),
    'create placeholder connector'
  );
  const deleteConnector = async () => {
    const response = await api.public(
      'DELETE',
      `/api/actions/connector/${encodeURIComponent(connectorId)}`
    );
    if (response.statusCode >= 300 && response.statusCode !== 404) {
      throw new Error(
        `delete placeholder connector failed: ${response.statusCode} ${JSON.stringify(
          response.body
        )}`
      );
    }
  };

  let features: InferenceFeatureSetting[];
  try {
    features =
      ok(
        await api.internal<{ data?: { features?: InferenceFeatureSetting[] } }>(
          'GET',
          INFERENCE_SETTINGS_URL
        ),
        'read inference settings'
      ).data?.features ?? [];
    const parent = features.find(
      ({ feature_id: featureId }) => featureId === ALERTZERO_INFERENCE_PARENT_FEATURE_ID
    );
    if (parent && parent.endpoints.length > 0) {
      return deleteConnector;
    }
    ok(
      await api.internal('PUT', INFERENCE_SETTINGS_URL, {
        body: {
          features: [
            ...features.filter(
              ({ feature_id: featureId }) => featureId !== ALERTZERO_INFERENCE_PARENT_FEATURE_ID
            ),
            { feature_id: ALERTZERO_INFERENCE_PARENT_FEATURE_ID, endpoints: [{ id: connectorId }] },
          ],
        },
      }),
      'assign placeholder model'
    );
  } catch (error) {
    await deleteConnector().catch(() => undefined); // best-effort; the setup error is the real one
    throw error;
  }

  return async () => {
    try {
      ok(
        await api.internal('PUT', INFERENCE_SETTINGS_URL, { body: { features } }),
        'restore inference settings'
      );
    } finally {
      await deleteConnector();
    }
  };
};

/** What `restoreWorkerBaseline` puts back: the state a suite found the worker in. */
export interface WorkerBaseline {
  workerId: string;
  enabled: boolean;
  autonomy: string;
  serviceAccountId?: string;
}

/**
 * Polls (up to `BASELINE_TIMEOUT_MS`) until the worker's stored settings can be read. An
 * `unavailable` record carries default settings, and restoring those would overwrite the real
 * ones, so it is retried rather than captured. A hook calling this needs
 * `BASELINE_TIMEOUT_MS` per worker on top of its other setup.
 */
export const captureWorkerBaseline = async (
  api: AlertZeroApi,
  workerId: string
): Promise<WorkerBaseline> => {
  const deadline = Date.now() + BASELINE_TIMEOUT_MS;
  return pollUntil(
    `worker ${workerId} settings to be readable for a baseline`,
    async () => {
      // Each read is cut off at the same deadline as the poll, so one hung request cannot
      // spend the next worker's budget in the isolation suite or surface as Playwright's
      // generic beforeAll timeout instead of this poll's worker-naming error.
      const deadline2 = timeoutSignal(Math.max(deadline - Date.now(), 1));
      try {
        const worker = await getWorker(api, workerId, {
          signal: deadline2,
        });
        if (worker.state === 'unavailable') {
          throw new Error(`Worker ${workerId} settings are unavailable`);
        }
        return {
          workerId,
          enabled: worker.enabled,
          autonomy: worker.settings.autonomy,
          serviceAccountId: worker.settings.serviceAccountId,
        };
      } finally {
        deadline2.dispose();
      }
    },
    { timeoutMs: BASELINE_TIMEOUT_MS }
  );
};

/**
 * Puts a worker back the way `captureWorkerBaseline` found it, after `resetWorker` left it
 * disabled and unbound. Settings first (account and autonomy), then the enable, because enabling
 * a worker without an account is rejected. An enable here starts a real run; the worker was
 * enabled before the suite, so that run is the restored state, not one to cancel.
 */
export const restoreWorkerBaseline = async (
  api: AlertZeroApi,
  baseline: WorkerBaseline
): Promise<void> => {
  const { workerId } = baseline;
  const current = await getWorker(api, workerId);
  const settings: Record<string, unknown> = {};
  if (current.settings.autonomy !== baseline.autonomy) {
    settings.autonomy = baseline.autonomy;
  }
  if (current.settings.serviceAccountId !== baseline.serviceAccountId) {
    settings.serviceAccountId = baseline.serviceAccountId ?? null;
  }
  if (Object.keys(settings).length > 0) {
    await updateWorker(api, workerId, {
      settingsRevision: current.settingsRevision ?? null,
      settings,
    });
  }
  if (baseline.enabled && !current.enabled) {
    await updateWorker(api, workerId, { enabled: true });
  }
};

interface ExecutionStep {
  stepId: string;
  stepType?: string;
  status: string;
  error?: { type?: string; message?: string };
}

export interface WorkflowExecution {
  id: string;
  status: string;
  workflowId?: string;
  triggeredBy?: string;
  startedAt?: string;
  concurrencyGroupKey?: string;
  cancellationReason?: string;
  error?: { type?: string; message?: string } | null;
  stepExecutions?: ExecutionStep[];
  context?: { inputs?: Record<string, unknown> };
}

interface ExecutionChild {
  workflowId: string;
  executionId: string;
  status: string;
  stepExecutions: ExecutionStep[];
}

const EXECUTIONS_URL = '/api/workflows/executions';
const TERMINAL_EXECUTION_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

/**
 * Polls an execution until it reaches the given status. Used before POSTing an approve: the
 * route answers 409 while the execution backing the proposal has not parked in
 * `waiting_for_input` yet, so the test waits for that state instead of retrying the 409.
 */
export const waitForExecutionStatus = async (
  api: AlertZeroApi,
  label: string,
  executionId: string,
  status: string,
  { timeoutMs }: { timeoutMs: number }
): Promise<WorkflowExecution> => {
  // `pollUntil` retries on a thrown error, so a wrong terminal status is returned as a value
  // and thrown below, instead of burning the whole timeout.
  let outcome: { execution: WorkflowExecution; reached: boolean };
  try {
    outcome = await pollUntil(
      label,
      async () => {
        const current = ok(
          await api.public<WorkflowExecution>('GET', `${EXECUTIONS_URL}/${executionId}`),
          `read execution ${executionId}`
        );
        if (current.status === status) {
          return { execution: current, reached: true };
        }
        return TERMINAL_EXECUTION_STATUSES.includes(current.status)
          ? { execution: current, reached: false }
          : undefined;
      },
      { timeoutMs }
    );
  } catch (error) {
    throw new Error(`${(error as Error).message}\n${await describeExecution(api, executionId)}`);
  }
  if (!outcome.reached) {
    throw new Error(
      `${label}: execution ${executionId} ended as '${
        outcome.execution.status
      }' instead of '${status}'\n${await describeExecution(api, executionId)}`
    );
  }
  return outcome.execution;
};

const formatStep = (step: ExecutionStep) =>
  `${step.stepId}${step.stepType ? ` (${step.stepType})` : ''}: ${step.status}${
    step.error ? ` - ${step.error.type ?? 'error'}: ${step.error.message ?? ''}` : ''
  }`;

/**
 * Why an execution is in the state it is in: its own status, error and cancellation reason, the
 * status and error of each step, and the same for the child executions it started. Used as the
 * assertion message so a red run explains itself without a second look at the server logs.
 */
export const describeExecution = async (
  api: AlertZeroApi,
  executionId: string
): Promise<string> => {
  const lines: string[] = [];
  try {
    const execution = ok(
      await api.public<WorkflowExecution>('GET', `${EXECUTIONS_URL}/${executionId}`),
      'read the execution'
    );
    lines.push(
      `execution ${execution.id} (${execution.workflowId ?? 'unknown workflow'}): ${
        execution.status
      }, triggeredBy=${execution.triggeredBy ?? 'n/a'}, concurrencyGroup=${
        execution.concurrencyGroupKey ?? 'n/a'
      }`
    );
    if (execution.error) {
      lines.push(`  error: ${execution.error.type ?? 'error'}: ${execution.error.message ?? ''}`);
    }
    if (execution.cancellationReason) {
      lines.push(`  cancellationReason: ${execution.cancellationReason}`);
    }
    for (const step of execution.stepExecutions ?? []) {
      lines.push(`  step ${formatStep(step)}`);
    }
  } catch (error) {
    lines.push(`could not read execution ${executionId}: ${(error as Error).message}`);
  }
  try {
    const children = ok(
      await api.public<ExecutionChild[]>('GET', `${EXECUTIONS_URL}/${executionId}/children`),
      'read the child executions'
    );
    for (const child of children) {
      lines.push(`  child ${child.executionId} (${child.workflowId}): ${child.status}`);
      for (const step of child.stepExecutions) {
        lines.push(`    step ${formatStep(step)}`);
      }
    }
  } catch (error) {
    lines.push(`could not read children of ${executionId}: ${(error as Error).message}`);
  }
  return lines.join('\n');
};

/**
 * Polls an execution to a terminal status. A timeout names the execution's last known state, so a
 * run that never finishes explains where it is parked.
 */
export const waitForWorkflowExecution = async (
  api: AlertZeroApi,
  label: string,
  executionId: string,
  { timeoutMs }: { timeoutMs: number }
): Promise<WorkflowExecution> => {
  try {
    return await pollUntil(
      label,
      async () => {
        const current = ok(
          await api.public<WorkflowExecution>('GET', `${EXECUTIONS_URL}/${executionId}`),
          `read execution ${executionId}`
        );
        return TERMINAL_EXECUTION_STATUSES.includes(current.status) ? current : undefined;
      },
      { timeoutMs }
    );
  } catch (error) {
    throw new Error(`${(error as Error).message}\n${await describeExecution(api, executionId)}`);
  }
};

const EXECUTIONS_PAGE_SIZE = 100;
// The route rejects `page * size` past the 10k ES result window.
const EXECUTIONS_MAX_PAGE = 100;

// Newest first, and without the index's step-run docs, so a new execution is on page 1 even
// past ~100 matching docs. Without a sort the query emits no sort and the order is arbitrary,
// which makes waitForNewExecution time out. The per-workflow route only accepts createdAt /
// finishedAt as sort fields, so "newest" means the latest createdAt here.
const listExecutionPage = async (
  api: AlertZeroApi,
  workflowId: string,
  page: number
): Promise<Array<{ id: string; status: string }>> =>
  ok(
    await api.public<{ results: Array<{ id: string; status: string }> }>(
      'GET',
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions` +
        `?size=${EXECUTIONS_PAGE_SIZE}&page=${page}&sortField=createdAt&sortOrder=desc&omitStepRuns=true`
    ),
    `list executions of ${workflowId}`
  ).results.map((run) => ({ id: run.id, status: run.status }));

/** The newest page only: where a run started after the caller's snapshot shows up. */
export const listExecutions = (
  api: AlertZeroApi,
  workflowId: string
): Promise<Array<{ id: string; status: string }>> => listExecutionPage(api, workflowId, 1);

/**
 * Every execution of the workflow, paged until a short page. Throws instead of truncating once
 * the result window is exhausted: both callers would misread a truncated list.
 */
const listAllExecutions = async (
  api: AlertZeroApi,
  workflowId: string
): Promise<Array<{ id: string; status: string }>> => {
  const runs: Array<{ id: string; status: string }> = [];
  for (let page = 1; page <= EXECUTIONS_MAX_PAGE; page++) {
    const pageRuns = await listExecutionPage(api, workflowId, page);
    runs.push(...pageRuns);
    if (pageRuns.length < EXECUTIONS_PAGE_SIZE) return runs;
  }
  throw new Error(
    `${workflowId} has more than ${EXECUTIONS_PAGE_SIZE * EXECUTIONS_MAX_PAGE} executions`
  );
};

/**
 * Every execution id of the workflow. This is the baseline teardown compares against, so a
 * truncated read would make an older in-flight run look like this suite's and get cancelled.
 */
export const listExecutionIds = async (api: AlertZeroApi, workflowId: string): Promise<string[]> =>
  (await listAllExecutions(api, workflowId)).map(({ id }) => id);

export const isTerminalExecutionStatus = (status: string): boolean =>
  TERMINAL_EXECUTION_STATUSES.includes(status);

/**
 * Ends the executions of `workflowId` that are still in flight and that are not in `knownIds`
 * (i.e. the ones started after the caller snapshotted the workflow's executions), then waits
 * until every one of them has left the in-flight states. Used by teardown: disabling a Worker
 * does not stop the run its enable started, and a run left behind can outlive the suite and
 * fail after the fact on the service account teardown deletes next.
 */
export const cancelNewExecutions = async (
  api: AlertZeroApi,
  workflowId: string,
  knownIds: readonly string[],
  { timeoutMs = DRAIN_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<void> => {
  // Every page: a fan-out of newer runs can push an older run this suite started past page 1.
  const inFlightNew = async () =>
    (await listAllExecutions(api, workflowId)).filter(
      (run) => !knownIds.includes(run.id) && !isTerminalExecutionStatus(run.status)
    );
  for (const run of await inFlightNew()) {
    const response = await api.public(
      'POST',
      `${EXECUTIONS_URL}/${encodeURIComponent(run.id)}/cancel`
    );
    // A 4xx means the execution left the in-flight states between the list and the cancel (it
    // finished, or Task Manager already cancelled it); the drain poll below is the judge.
    if (!(response.statusCode >= 400 && response.statusCode < 500)) {
      ok(response, `cancel execution ${run.id} of ${workflowId}`);
    }
  }
  try {
    await pollUntil(
      `every in-flight execution of ${workflowId} that this run started to stop`,
      async () => ((await inFlightNew()).length === 0 ? true : undefined),
      { timeoutMs }
    );
  } catch (error) {
    throw new Error(
      `${(error as Error).message}; still in flight: ${JSON.stringify(await inFlightNew())}`
    );
  }
};

/**
 * Waits for an execution of `workflowId` that is not in `knownIds`, i.e. one that started after the
 * caller took its snapshot. Enabling a scheduled Worker makes Task Manager run it straight away, as
 * the Worker's service account. That is the supported way to run a Worker, and the only one that
 * works here: the shared runner started by hand runs as the caller, cannot inherit a service
 * account, and shares a `cancel-in-progress` concurrency key with the Worker's own run, so the two
 * cancel each other.
 */
export const waitForNewExecution = async (
  api: AlertZeroApi,
  workflowId: string,
  knownIds: readonly string[],
  { timeoutMs }: { timeoutMs: number }
): Promise<string> =>
  pollUntil(
    `a new execution of ${workflowId} (the enabled worker's immediate scheduled run)`,
    async () =>
      (await listExecutions(api, workflowId)).find((run) => !knownIds.includes(run.id))?.id,
    { timeoutMs }
  );

/** Throws, with the execution's per-step breakdown, unless it completed. */
export const assertExecutionCompleted = async (
  api: AlertZeroApi,
  label: string,
  execution: WorkflowExecution
): Promise<void> => {
  if (execution.status !== 'completed') {
    throw new Error(
      `${label} ended ${execution.status}, expected completed\n${await describeExecution(
        api,
        execution.id
      )}`
    );
  }
};

export interface PendingProposal {
  id: string;
  createdAt: string;
  /**
   * Conversation behind the proposal — the Investigation the review that raised it owns.
   * Optional because older proposals (and list views without it) resolve without the field;
   * teardowns that collect it must treat `undefined` as "nothing to delete".
   */
  conversationId?: string;
  actionWorkflowId?: string;
  workflowExecutionId?: string;
  actionInput?: unknown;
}

/** Identifiers that tie a proposal to one e2e run's seeded data. Every member must be minted
 * per run: a constant such as the scenario hostname matches the proposals of every run that
 * seeds the same scenario in the shared space. */
export interface RunReferences {
  readonly agentId?: string;
  readonly alertIds?: readonly string[];
}

const PROPOSALS_PAGE_SIZE = 100;
// The list route rejects an offset past this.
const PROPOSALS_MAX_OFFSET = 9_900;

/**
 * Reads every pending AlertZero proposal, not just the first page: the space is shared, so
 * leftovers from other runs can push this run's proposals past page one. `order: 'newest'` is a
 * total order, which keeps the pages from repeating or skipping a row. Paging follows `total`
 * rather than the page length, because the route drops a proposal it settles while reading.
 */
export const listPendingProposals = async (api: AlertZeroApi): Promise<PendingProposal[]> => {
  const proposals: PendingProposal[] = [];
  for (let from = 0; from <= PROPOSALS_MAX_OFFSET; from += PROPOSALS_PAGE_SIZE) {
    const page = ok(
      await api.internal<ListProposalsResponse>('GET', '/internal/proposals', {
        query: {
          origin: 'alertzero',
          status: 'pending',
          order: 'newest',
          size: PROPOSALS_PAGE_SIZE,
          from,
        },
      }),
      `list pending proposals from ${from}`
    );
    proposals.push(...page.proposals);
    if (from + PROPOSALS_PAGE_SIZE >= page.total) {
      break;
    }
  }
  return proposals;
};

/**
 * Whether this run raised the proposal. The default space is shared, so `actionWorkflowId` and
 * `createdAt` match the proposals of every AlertZero run in it; a candidate is only accepted when
 * it references one of this run's seeded identifiers — in its own input, or in the inputs of the
 * review execution that raised it (those name the alerts the attack correlated; the proposal's
 * own input holds only opaque ids). Every identifier is minted per run by the seed helpers, so
 * a proposal raised over another run's seed data can never match.
 */
export const proposalReferencesRun = async (
  api: AlertZeroApi,
  proposal: PendingProposal,
  references: RunReferences
): Promise<boolean> => {
  const reviewExecutionId = (
    proposal.actionInput as { workflow_execution_id?: unknown } | undefined
  )?.workflow_execution_id;
  let reviewInputs: unknown;
  if (typeof reviewExecutionId === 'string') {
    const review = await api.public<WorkflowExecution>(
      'GET',
      `${EXECUTIONS_URL}/${encodeURIComponent(reviewExecutionId)}`
    );
    // A stale proposal from another run can point at an execution that no longer exists. That
    // proposal is not this run's, so it falls back to its own fields instead of failing the
    // poll; any other error still fails loudly.
    if (review.statusCode !== 404) {
      reviewInputs = ok(review, `read the review execution behind proposal ${proposal.id}`).context
        ?.inputs;
    }
  }
  const encoded = JSON.stringify({
    actionInput: proposal.actionInput ?? {},
    reviewInputs,
    workflowExecutionId: proposal.workflowExecutionId,
  });
  return (
    (references.agentId !== undefined && encoded.includes(references.agentId)) ||
    (references.alertIds ?? []).some((alertId) => encoded.includes(alertId))
  );
};

/**
 * Polls for the pending proposal of `actionWorkflowId` that this run raised. Candidates from
 * other runs are skipped rather than returned: returning one would end the poll on the wrong
 * proposal and fail the seeded-run assertion immediately instead of waiting for this run's.
 */
export const pollForRunProposal = async (
  api: AlertZeroApi,
  actionWorkflowId: string,
  references: RunReferences,
  { timeoutMs }: { timeoutMs: number }
): Promise<PendingProposal> =>
  pollUntil(
    `a pending proposal of ${actionWorkflowId} raised by this run`,
    async () => {
      for (const candidate of (await listPendingProposals(api)).filter(
        (proposal) => proposal.actionWorkflowId === actionWorkflowId
      )) {
        if (await proposalReferencesRun(api, candidate, references)) {
          return candidate;
        }
      }
      return undefined;
    },
    { timeoutMs }
  );

/**
 * Dismisses every pending proposal this run left behind. A spec that fails between a proposal's
 * creation and its approval otherwise leaks it into the shared space, where later suites and
 * retries inherit an actionable proposal pointing at deleted test resources. Dismissal (not
 * approval) releases the parked run behind it, which then ends on its declined branch — so it
 * must run while the resources it may touch (the service account) still exist.
 */
export const dismissRunProposals = async (
  api: AlertZeroApi,
  references: RunReferences
): Promise<void> => {
  for (const proposal of await listPendingProposals(api)) {
    if (await proposalReferencesRun(api, proposal, references)) {
      const response = await api.internal(
        'POST',
        `/internal/proposals/${encodeURIComponent(proposal.id)}/dismiss`,
        { body: { dismissReason: 'handled_elsewhere', rationale: 'AlertZero e2e teardown' } }
      );
      // `api.internal` resolves non-2xx responses as values; a 409 means the proposal was decided
      // concurrently (its spec approved or dismissed it), which teardown can accept.
      if (response.statusCode >= 300 && response.statusCode !== 409) {
        throw new Error(
          `dismiss proposal ${proposal.id} failed: ${response.statusCode} ${JSON.stringify(
            response.body
          )}`
        );
      }
    }
  }
};
