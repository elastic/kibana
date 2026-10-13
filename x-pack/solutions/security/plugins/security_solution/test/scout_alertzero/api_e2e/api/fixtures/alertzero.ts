/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import {
  AD2_ALERTS_INDEX,
  AD2_SCENARIO_ALL_INDICES,
  buildAd2SeedPlan,
  getAd2ScenarioAlertIds,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import { ATTACK_SCENARIO_KEY } from '../../common/constants';
import { ok, pollUntil } from '../../common/kbn';
import type { AlertZeroApi } from '../../common/kbn';

const WORKERS_URL = '/internal/alertzero/workers';
const SERVICE_ACCOUNT_URL = '/internal/security/service_account';

export interface SeededScenario {
  readonly runMarker: string;
  readonly alertIds: readonly string[];
  readonly cleanup: () => Promise<void>;
}

/**
 * Indexes one AD2 attack chain (alerts + raw endpoint events) tagged with a marker owned by this
 * run, so cleanup removes only what this run wrote.
 */
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
  // Removes only what this run wrote, keyed on the run marker. Shared by the failure rollback
  // below and the returned cleanup so a partially seeded run cannot leak documents.
  const removeSeeded = async (): Promise<void> => {
    for (const index of AD2_SCENARIO_ALL_INDICES) {
      await esClient
        .deleteByQuery({
          index,
          conflicts: 'proceed',
          refresh: true,
          query: { term: { 'labels.ad_portable_seed': runMarker } },
        })
        .catch((error: { statusCode?: number }) => {
          if (error.statusCode !== 404) {
            throw error;
          }
        });
    }
  };

  try {
    await bulk(plan.alerts, 'index');
    // Raw endpoint events live in data streams, which only accept `create`.
    await bulk(plan.rawEvents, 'create');
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
}

export const listWorkers = async (api: AlertZeroApi): Promise<WorkerRecord[]> =>
  ok(await api.internal<{ workers: WorkerRecord[] }>('GET', WORKERS_URL), 'list workers').workers;

export const getWorker = async (api: AlertZeroApi, workerId: string): Promise<WorkerRecord> => {
  const worker = (await listWorkers(api)).find((candidate) => candidate.id === workerId);
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
  try {
    return await pollUntil(
      label,
      async () => {
        const current = ok(
          await api.public<WorkflowExecution>('GET', `${EXECUTIONS_URL}/${executionId}`),
          `read execution ${executionId}`
        );
        return current.status === status ? current : undefined;
      },
      { timeoutMs }
    );
  } catch (error) {
    throw new Error(`${(error as Error).message}\n${await describeExecution(api, executionId)}`);
  }
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
export const waitForExecution = async (
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

// Newest first, and without the index's step-run docs, so a new execution is on page 1 even
// past ~100 matching docs. Without a sort the query emits no sort and the order is arbitrary,
// which makes waitForNewExecution time out. The per-workflow route only accepts createdAt /
// finishedAt as sort fields, so "newest" means the latest createdAt here.
export const listExecutionIds = async (api: AlertZeroApi, workflowId: string): Promise<string[]> =>
  ok(
    await api.public<{ results: Array<{ id: string }> }>(
      'GET',
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions` +
        `?size=100&sortField=createdAt&sortOrder=desc&omitStepRuns=true`
    ),
    `list executions of ${workflowId}`
  ).results.map((run) => run.id);

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
    async () => (await listExecutionIds(api, workflowId)).find((id) => !knownIds.includes(id)),
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
