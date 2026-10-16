/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import { PUBLIC_API_VERSION } from '../constants';
import { fpTpAdhocAttackIndexForSpace, kbnErrorMessage, type FpTpLiveKbnRequest } from '../world';
import {
  AD_REVIEW_WORKFLOW_ID,
  AD_WORKER_ID,
  AD_WORKER_SERVICE_ACCOUNT_NAME,
  ALERTZERO_INTERNAL_API_VERSION,
  ALERTZERO_WORKERS_ROUTE,
  SERVICE_ACCOUNT_ROUTE,
  adReviewConcurrencyKey,
} from './constants';

const POLL_INTERVAL_MS = 10_000;
const AUTO_RUN_GRACE_MS = 20_000;
const SERVICE_ACCOUNT_PAGE_SIZE = 100;
const GENERATED_ATTACKS_PAGE_SIZE = 100;
const IN_FLIGHT_STATUSES: readonly ExecutionStatus[] = [
  ExecutionStatus.PENDING,
  ExecutionStatus.RUNNING,
  ExecutionStatus.WAITING,
  ExecutionStatus.WAITING_FOR_CHILD,
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.QUEUED,
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

const requireOk = <T>(label: string, response: { statusCode: number; body: unknown }): T => {
  if (response.statusCode >= 400) {
    throw new Error(`${label} (${response.statusCode}): ${kbnErrorMessage(response.body)}`);
  }
  return response.body as T;
};

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

const listServiceAccounts = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<ServiceAccountEntry[]> => {
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page = requireOk<{ serviceAccounts: ServiceAccountEntry[]; nextPage?: string }>(
      'Failed to list service accounts',
      await kbnRequest({
        method: 'GET',
        path: `${SERVICE_ACCOUNT_ROUTE}?limit=${SERVICE_ACCOUNT_PAGE_SIZE}${
          after === undefined ? '' : `&after=${encodeURIComponent(after)}`
        }`,
      })
    );
    accounts.push(...page.serviceAccounts);
    after = page.nextPage;
  } while (after !== undefined);
  return accounts;
};

/** The id of a usable account with the Worker's name; throws when one exists but is unusable. */
const findUsableAccountId = (accounts: readonly ServiceAccountEntry[]): string | undefined => {
  const usable = accounts.find(
    ({ name, enabled, assumable }) =>
      name === AD_WORKER_SERVICE_ACCOUNT_NAME && enabled && assumable
  );
  if (usable !== undefined) {
    return usable.id;
  }
  if (accounts.some(({ name }) => name === AD_WORKER_SERVICE_ACCOUNT_NAME)) {
    throw new Error(
      `Service account ${AD_WORKER_SERVICE_ACCOUNT_NAME} exists but is disabled or not ` +
        'assumable. Fix it, or pass --serviceAccountId.'
    );
  }
  return undefined;
};

/**
 * Returns the AD Worker's service account: an enabled, assumable account with the
 * Worker's name, else a new one with the Worker's built-in role (what the AlertZero pages
 * do on an admin's first visit). A 409 means another seed created it concurrently, so the
 * accounts are listed again.
 */
export const ensureAdWorkerServiceAccount = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<string> => {
  const existing = findUsableAccountId(await listServiceAccounts(kbnRequest));
  if (existing !== undefined) {
    return existing;
  }
  const created = await kbnRequest({
    method: 'POST',
    path: SERVICE_ACCOUNT_ROUTE,
    body: {
      name: AD_WORKER_SERVICE_ACCOUNT_NAME,
      description: `AlertZero Attack Discovery Worker (role ${AD_WORKER_SERVICE_ACCOUNT_NAME})`,
      roles: [AD_WORKER_SERVICE_ACCOUNT_NAME],
    },
  });
  if (created.statusCode === 409) {
    const concurrent = findUsableAccountId(await listServiceAccounts(kbnRequest));
    if (concurrent !== undefined) {
      return concurrent;
    }
  }
  return requireOk<{ id: string }>(
    `Failed to create service account ${AD_WORKER_SERVICE_ACCOUNT_NAME}`,
    created
  ).id;
};

interface WorkerResponse {
  id: string;
  enabled: boolean;
  settings: { autonomy: string; serviceAccountId?: string };
  settingsRevision: number | null;
  workflowId: string | null;
  blockingReasons: string[];
}

const readAdWorker = async (kbnRequest: FpTpLiveKbnRequest): Promise<WorkerResponse> => {
  const { workers } = requireOk<{ workers: WorkerResponse[] }>(
    'Failed to list AlertZero workers',
    await kbnRequest({
      method: 'GET',
      path: ALERTZERO_WORKERS_ROUTE,
      version: ALERTZERO_INTERNAL_API_VERSION,
    })
  );
  const worker = workers.find(({ id }) => id === AD_WORKER_ID);
  if (worker === undefined) {
    throw new Error(`AlertZero lists no ${AD_WORKER_ID} worker. Is AlertZero enabled?`);
  }
  return worker;
};

export interface EnabledAdWorker {
  /** The per-space floor workflow to run. */
  readonly workflowId: string;
  /** True when this call switched the Worker on, which starts a run by itself. */
  readonly enabledNow: boolean;
}

/**
 * Enables the AD Worker in the space with `manual` autonomy, so true-positive and
 * inconclusive reviews stop at an analyst gate instead of handing off to Forensics.
 * `serviceAccountId` replaces the account the Worker runs as; without it the stored
 * account is kept, or the Worker's own account is found or created.
 */
export const enableAdWorker = async ({
  kbnRequest,
  serviceAccountId,
}: {
  kbnRequest: FpTpLiveKbnRequest;
  serviceAccountId?: string;
}): Promise<EnabledAdWorker> => {
  const worker = await readAdWorker(kbnRequest);
  if (worker.blockingReasons.length > 0) {
    throw new Error(
      `${AD_WORKER_ID} cannot run in this space: ${worker.blockingReasons.join(', ')}`
    );
  }
  const storedAccount = worker.settings.serviceAccountId;
  if (
    worker.enabled &&
    worker.settings.autonomy === 'manual' &&
    storedAccount !== undefined &&
    (serviceAccountId === undefined || serviceAccountId === storedAccount) &&
    worker.workflowId !== null
  ) {
    return { workflowId: worker.workflowId, enabledNow: false };
  }

  const { worker: updated } = requireOk<{ worker: WorkerResponse }>(
    `Failed to enable ${AD_WORKER_ID}`,
    await kbnRequest({
      method: 'PATCH',
      path: `${ALERTZERO_WORKERS_ROUTE}/${encodeURIComponent(AD_WORKER_ID)}`,
      version: ALERTZERO_INTERNAL_API_VERSION,
      body: {
        enabled: true,
        settingsRevision: worker.settingsRevision,
        settings: {
          autonomy: 'manual',
          serviceAccountId:
            serviceAccountId ?? storedAccount ?? (await ensureAdWorkerServiceAccount(kbnRequest)),
        },
      },
    })
  );
  if (updated.workflowId === null) {
    throw new Error(`${AD_WORKER_ID} was enabled but reports no installed workflow`);
  }
  return { workflowId: updated.workflowId, enabledNow: !worker.enabled };
};

interface ExecutionListItem {
  id: string;
  status: ExecutionStatus;
  startedAt?: string;
}

const listExecutions = async (
  kbnRequest: FpTpLiveKbnRequest,
  workflowId: string,
  query: Record<string, string | readonly string[]>
): Promise<ExecutionListItem[]> => {
  const params = new URLSearchParams({ size: '20' });
  for (const [key, value] of Object.entries(query)) {
    for (const item of typeof value === 'string' ? [value] : value) {
      params.append(key, item);
    }
  }
  const { results } = requireOk<{ results: ExecutionListItem[] }>(
    `Failed to list executions of ${workflowId}`,
    await kbnRequest({
      method: 'GET',
      path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions?${params}`,
      version: PUBLIC_API_VERSION,
    })
  );
  return [...results].sort((left, right) =>
    String(right.startedAt ?? '').localeCompare(String(left.startedAt ?? ''))
  );
};

const readExecution = async (
  kbnRequest: FpTpLiveKbnRequest,
  executionId: string
): Promise<WorkflowExecutionDto> =>
  requireOk<WorkflowExecutionDto>(
    `Failed to read execution ${executionId}`,
    await kbnRequest({
      method: 'GET',
      path: `/api/workflows/executions/${encodeURIComponent(executionId)}?includeOutput=true`,
      version: PUBLIC_API_VERSION,
    })
  );

const findInFlightRun = async (
  kbnRequest: FpTpLiveKbnRequest,
  workflowId: string,
  startedAfter: string
): Promise<string | undefined> =>
  (await listExecutions(kbnRequest, workflowId, { statuses: IN_FLIGHT_STATUSES, startedAfter }))[0]
    ?.id;

/**
 * Starts a run of the per-space floor workflow, or adopts one already in flight since
 * `since` (enabling the Worker starts one). Never run the review workflow by hand: it
 * inherits its identity from the floor run and fails without that parent.
 */
export const startFloorRun = async ({
  kbnRequest,
  workflowId,
  since,
  enabledNow,
}: {
  kbnRequest: FpTpLiveKbnRequest;
  workflowId: string;
  since: string;
  enabledNow: boolean;
}): Promise<string> => {
  const graceDeadline = Date.now() + (enabledNow ? AUTO_RUN_GRACE_MS : 0);
  do {
    const inFlight = await findInFlightRun(kbnRequest, workflowId, since);
    if (inFlight !== undefined) {
      return inFlight;
    }
    if (Date.now() < graceDeadline) {
      await sleep(POLL_INTERVAL_MS / 2);
    }
  } while (Date.now() < graceDeadline);

  const { workflowExecutionId } = requireOk<{ workflowExecutionId: string }>(
    `Failed to run ${workflowId}`,
    await kbnRequest({
      method: 'POST',
      path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
      version: PUBLIC_API_VERSION,
      body: { inputs: {} },
    })
  );
  return workflowExecutionId;
};

/**
 * Waits for the floor run to finish. The floor cancels an older run when a newer one
 * starts, so a cancelled run is followed by the newer one when there is one.
 */
export const waitForFloorRun = async ({
  kbnRequest,
  workflowId,
  executionId,
  deadline,
  log,
}: {
  kbnRequest: FpTpLiveKbnRequest;
  workflowId: string;
  executionId: string;
  deadline: number;
  log: ToolingLog;
}): Promise<WorkflowExecutionDto> => {
  let current = executionId;
  while (Date.now() < deadline) {
    const execution = await readExecution(kbnRequest, current);
    const newer =
      execution.status === ExecutionStatus.CANCELLED
        ? await findInFlightRun(kbnRequest, workflowId, execution.startedAt)
        : undefined;
    if (newer !== undefined && newer !== current) {
      log.info(`Floor run ${current} was superseded by ${newer}; following it`);
      current = newer;
    } else if (isTerminal(execution.status)) {
      return execution;
    } else {
      await sleep(POLL_INTERVAL_MS);
    }
  }
  throw new Error(`Floor run ${current} did not finish before the wait ran out`);
};

const GENERATION_WORKFLOW_ID = 'system-security-attack-discovery-batched-generation';

const childExecutionIds = async (
  kbnRequest: FpTpLiveKbnRequest,
  executionId: string
): Promise<Array<{ executionId: string; workflowId: string }>> =>
  requireOk<Array<{ executionId: string; workflowId: string }>>(
    `Failed to read the children of execution ${executionId}`,
    await kbnRequest({
      method: 'GET',
      path: `/api/workflows/executions/${encodeURIComponent(executionId)}/children`,
      version: PUBLIC_API_VERSION,
    })
  );

/**
 * Reads the batch errors of the generation run under a floor run. A failed batch does
 * not fail the floor run, so a run that generated nothing still ends `completed`.
 */
export const readGenerationErrors = async (
  kbnRequest: FpTpLiveKbnRequest,
  floorExecutionId: string
): Promise<string[]> => {
  const runners = await childExecutionIds(kbnRequest, floorExecutionId);
  const generations = (
    await Promise.all(runners.map(({ executionId }) => childExecutionIds(kbnRequest, executionId)))
  )
    .flat()
    .filter(({ workflowId }) => workflowId === GENERATION_WORKFLOW_ID);
  const executions = await Promise.all(
    generations.map(({ executionId }) => readExecution(kbnRequest, executionId))
  );
  return executions.flatMap((execution) => {
    const output = (execution.context?.output ?? stepOutput(execution, 'emit_result')) as
      | { batch_errors?: unknown }
      | undefined;
    const errors = Array.isArray(output?.batch_errors) ? output?.batch_errors ?? [] : [];
    return errors.map((error) => String((error as { message?: unknown }).message ?? error));
  });
};

export interface GeneratedAttack {
  readonly attackId: string;
  readonly title: string;
  readonly alertIds: readonly string[];
}

/** Attacks generated since `since` that cite at least one of `alertIds`. */
export const findGeneratedAttacks = async ({
  esClient,
  space,
  alertIds,
  since,
}: {
  esClient: EsClient;
  space: string;
  alertIds: readonly string[];
  since: string;
}): Promise<GeneratedAttack[]> => {
  const response = await esClient.search<Record<string, unknown>>({
    index: fpTpAdhocAttackIndexForSpace(space),
    ignore_unavailable: true,
    size: GENERATED_ATTACKS_PAGE_SIZE,
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.alert.attack_discovery.alert_ids': [...alertIds] } },
          { range: { '@timestamp': { gte: since } } },
        ],
      },
    },
  });
  return response.hits.hits.flatMap(({ _id: id, _source: source }) => {
    if (id === undefined || source === undefined) {
      return [];
    }
    const cited = source['kibana.alert.attack_discovery.alert_ids'];
    return [
      {
        attackId: id,
        title: String(source['kibana.alert.attack_discovery.title'] ?? ''),
        alertIds: Array.isArray(cited) ? cited.map(String) : [],
      },
    ];
  });
};

/**
 * The Investigation id the review derives from the attack id: its first 30 hex
 * characters as a UUIDv8 (attack_discovery_review.yaml, `resolve_investigation_id`).
 */
export const toInvestigationId = (attackId: string): string =>
  `${attackId.slice(0, 8)}-${attackId.slice(8, 12)}-8${attackId.slice(12, 15)}-8${attackId.slice(
    15,
    18
  )}-${attackId.slice(18, 30)}`;

export interface ReviewProgress {
  readonly attackId: string;
  readonly reviewExecutionId?: string;
  readonly reviewStatus?: ExecutionStatus;
  readonly investigationId: string;
  /** Set once the review resolved its analysis; `failed` when the analysis failed. */
  readonly verdict?: string;
}

const stepOutput = (
  execution: WorkflowExecutionDto,
  stepId: string
): Record<string, unknown> | undefined => {
  const step = execution.stepExecutions.find(
    (candidate) => candidate.stepId === stepId && candidate.status === ExecutionStatus.COMPLETED
  );
  const output = step?.output;
  return typeof output === 'object' && output !== null && !Array.isArray(output)
    ? (output as Record<string, unknown>)
    : undefined;
};

/**
 * Reads where one review stands. The verdict comes from the review's `resolve_analysis`
 * step rather than its output: under `manual` autonomy a true-positive or inconclusive
 * review then parks at the analyst gate for up to 72h.
 */
export const toReviewProgress = (
  attackId: string,
  execution: WorkflowExecutionDto | undefined
): ReviewProgress => {
  const investigationId = execution
    ? stepOutput(execution, 'resolve_investigation_id')?.investigation_id
    : undefined;
  const verdict = execution ? stepOutput(execution, 'resolve_analysis')?.verdict : undefined;
  return {
    attackId,
    reviewExecutionId: execution?.id,
    reviewStatus: execution?.status,
    investigationId:
      typeof investigationId === 'string' ? investigationId : toInvestigationId(attackId),
    ...(typeof verdict === 'string' ? { verdict } : {}),
  };
};

/** A review is settled once its analysis resolved or the run ended without one. */
export const isReviewSettled = ({ verdict, reviewStatus }: ReviewProgress): boolean =>
  verdict !== undefined || (reviewStatus !== undefined && isTerminal(reviewStatus));

/** Polls each attack's review until every one is settled or `deadline` passes. */
export const waitForReviews = async ({
  kbnRequest,
  attackIds,
  deadline,
  log,
}: {
  kbnRequest: FpTpLiveKbnRequest;
  attackIds: readonly string[];
  deadline: number;
  log: ToolingLog;
}): Promise<ReviewProgress[]> => {
  const readProgress = async (attackId: string): Promise<ReviewProgress> => {
    const [latest] = await listExecutions(kbnRequest, AD_REVIEW_WORKFLOW_ID, {
      concurrencyGroupKey: adReviewConcurrencyKey(attackId),
    });
    return toReviewProgress(
      attackId,
      latest === undefined ? undefined : await readExecution(kbnRequest, latest.id)
    );
  };

  let progress: ReviewProgress[] = [];
  do {
    progress = await Promise.all(attackIds.map(readProgress));
    const pending = progress.filter((review) => !isReviewSettled(review));
    if (pending.length === 0) {
      return progress;
    }
    log.info(`Waiting for ${pending.length} of ${progress.length} review(s)`);
    await sleep(POLL_INTERVAL_MS);
  } while (Date.now() < deadline);
  return progress;
};
