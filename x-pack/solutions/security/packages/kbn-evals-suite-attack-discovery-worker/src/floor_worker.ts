/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTZERO_WORKERS_URL,
  API_VERSIONS,
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  buildWorkerUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  EVAL_SPACE_ID,
  FLOOR_SCHEDULE_INTERVAL,
  FLOOR_TICK_CANCEL_TIMEOUT_MS,
  FLOOR_TICK_POLL_INTERVAL_MS,
  FLOOR_TICK_WAIT_MS,
  PUBLIC_API_VERSION,
  RUNNER_WORKFLOW_ID,
} from './constants';
import { apiVersion, errorMessage, httpStatus, sleep, spacePath } from './kibana_api';

export const FLOOR_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

/** The built-in service account (and, on stateful, the reserved role of the same name). */
export const FLOOR_SERVICE_ACCOUNT_NAME = WORKER_SERVICE_ACCOUNT_NAMES[FLOOR_WORKER_ID];

const LIST_PAGE_SIZE = 100;
const CONFLICT_LOOKUP_ATTEMPTS = 5;
const CONFLICT_LOOKUP_DELAY_MS = 500;

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled?: boolean;
  assumable?: boolean;
}

interface WorkerEntry {
  id: string;
  enabled: boolean;
  settings?: { serviceAccountId?: string | null; autonomy?: string; scheduleInterval?: string };
  settingsRevision?: number | null;
  workflowId?: string;
  blockingReasons?: string[];
}

const listServiceAccounts = async (fetch: HttpHandler): Promise<ServiceAccountEntry[]> => {
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page: { serviceAccounts: ServiceAccountEntry[]; nextPage?: string | null } = await fetch(
      SECURITY_SERVICE_ACCOUNT_URL,
      { method: 'GET', query: { limit: LIST_PAGE_SIZE, ...(after ? { after } : {}) } }
    );
    accounts.push(...page.serviceAccounts);
    after = page.nextPage ?? undefined;
  } while (after);
  return accounts;
};

const findUsable = (accounts: readonly ServiceAccountEntry[], name: string) =>
  accounts.find((account) => account.name === name && account.enabled && account.assumable);

/**
 * Finds the floor worker's built-in service account, creating it with the built-in role when it
 * does not exist. This is the production flow: the role is Elasticsearch's own reserved role
 * and is never created or changed here.
 */
export const ensureFloorServiceAccount = async (
  fetch: HttpHandler,
  log: ToolingLog
): Promise<string> => {
  const name = FLOOR_SERVICE_ACCOUNT_NAME;
  const existing = findUsable(await listServiceAccounts(fetch), name);
  if (existing) return existing.id;

  const role = getWorkerRoleName(name, { isServerless: false });
  const roleDocument = await fetch<{ metadata?: { _reserved?: unknown } }>(
    buildSecurityRoleUrl(role),
    { method: 'GET', headers: apiVersion(SECURITY_ROLE_API_VERSION) }
  ).catch((error) => {
    throw new Error(
      `The built-in role "${role}" is not readable (${errorMessage(
        error
      )}). The eval stack must ship the reserved Attack Discovery worker role.`
    );
  });
  if (roleDocument.metadata?._reserved !== true) {
    throw new Error(
      `Role "${role}" exists but is not a reserved built-in role; refusing to use it.`
    );
  }

  try {
    const { id } = await fetch<{ id: string }>(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description:
          'Runs the Attack Discovery worker (created by the Attack Discovery Worker evals)',
        roles: [role],
      }),
    });
    log.info(`[ad-worker] created service account "${name}" (${id}) with role "${role}"`);
    return id;
  } catch (error) {
    if (httpStatus(error) !== 409) throw error;
  }
  // A concurrent create lists the account before its credential exists, so wait for it.
  for (let attempt = 0; attempt < CONFLICT_LOOKUP_ATTEMPTS; attempt++) {
    await sleep(CONFLICT_LOOKUP_DELAY_MS);
    const found = findUsable(await listServiceAccounts(fetch), name);
    if (found) return found.id;
  }
  throw new Error(`Service account "${name}" was created concurrently but never became usable.`);
};

const readFloorWorker = async (fetch: HttpHandler, spaceId: string): Promise<WorkerEntry> => {
  const { workers } = await fetch<{ workers: WorkerEntry[] }>(
    spacePath(spaceId, ALERTZERO_WORKERS_URL),
    { method: 'GET', headers: apiVersion(API_VERSIONS.internal.v1) }
  );
  const worker = workers.find(({ id }) => id === FLOOR_WORKER_ID);
  if (!worker) {
    throw new Error(`The AlertZero worker catalog does not list "${FLOOR_WORKER_ID}".`);
  }
  return worker;
};

const patchFloorWorker = async (
  fetch: HttpHandler,
  spaceId: string,
  body: Record<string, unknown>
): Promise<void> => {
  await fetch(spacePath(spaceId, buildWorkerUrl(FLOOR_WORKER_ID)), {
    method: 'PATCH',
    headers: apiVersion(API_VERSIONS.internal.v1),
    body: JSON.stringify(body),
  });
};

export interface EnabledFloorWorker {
  /** Id of the per-space managed workflow that a run is started from. */
  workflowId: string;
  /** Puts the worker back as it was found. */
  restore: () => Promise<void>;
}

/** `settings.concurrency.max` of the floor and runner workflows (both `cancel-in-progress`). */
export const WORKFLOW_CONCURRENCY_MAX = 1;
/**
 * The running execution plus the one it is cancelling. Only emptiness and a few ids for the log
 * matter here (cancelling is workflow-wide), so a single page is enough and nothing paginates.
 */
const ACTIVE_LIST_SIZE = WORKFLOW_CONCURRENCY_MAX * 2;

const listActiveExecutionIds = async (
  fetch: HttpHandler,
  spaceId: string,
  workflowId: string
): Promise<string[]> => {
  // A failed listing must not read as "idle": a row would then start while a run still holds the
  // concurrency slot, so surface it instead of continuing.
  const { results } = await fetch<{ results: Array<{ id: string }> }>(
    spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions`),
    {
      method: 'GET',
      headers: apiVersion(PUBLIC_API_VERSION),
      query: {
        statuses: [...NonTerminalExecutionStatuses],
        omitStepRuns: true,
        size: ACTIVE_LIST_SIZE,
      },
    }
  ).catch((error) => {
    throw new Error(
      `Could not list the active executions of "${workflowId}" in space "${spaceId}" (${errorMessage(
        error
      )}).`
    );
  });
  return results.map(({ id }) => id);
};

/** Polls until the workflow holds no active execution; throws if one outlives `timeoutMs`. */
const waitUntilIdle = async ({
  fetch,
  spaceId,
  workflowId,
  timeoutMs,
  describeRace,
}: {
  fetch: HttpHandler;
  spaceId: string;
  workflowId: string;
  timeoutMs: number;
  describeRace: string;
}): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let active: string[];
  while ((active = await listActiveExecutionIds(fetch, spaceId, workflowId)).length > 0) {
    if (Date.now() >= deadline) {
      throw new Error(
        `${describeRace} "${workflowId}" is still active ${timeoutMs}ms after it was cancelled (${active.join(
          ', '
        )}); a row would race it.`
      );
    }
    await sleep(FLOOR_TICK_POLL_INTERVAL_MS);
  }
};

/**
 * Task Manager runs a new recurring task at once, so enabling the worker starts one scheduled
 * execution whatever the interval. Its concurrency cancels in progress, so left alone it
 * cancels the manual run (or the manual run cancels it half way, leaving a runner with no
 * steps). Waits a bounded time for that execution, cancels it, and returns once the
 * workflow and the runner it started hold no active execution. Returns whether a tick was found.
 */
export const settleEnableTimeRun = async ({
  fetch,
  log,
  workflowId,
  spaceId = EVAL_SPACE_ID,
  waitMs = FLOOR_TICK_WAIT_MS,
  cancelTimeoutMs = FLOOR_TICK_CANCEL_TIMEOUT_MS,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  workflowId: string;
  spaceId?: string;
  waitMs?: number;
  cancelTimeoutMs?: number;
}): Promise<boolean> => {
  const waitDeadline = Date.now() + waitMs;
  let active = await listActiveExecutionIds(fetch, spaceId, workflowId);
  while (active.length === 0 && Date.now() < waitDeadline) {
    await sleep(FLOOR_TICK_POLL_INTERVAL_MS);
    active = await listActiveExecutionIds(fetch, spaceId, workflowId);
  }
  if (active.length === 0) {
    log.warning(
      `[ad-worker] no enable-time scheduled run appeared within ${waitMs}ms; starting rows. A late ` +
        "scheduled tick can still cancel the first row's manual run (the floor workflow cancels " +
        'in progress, max 1), so a first row that is cancelled for no visible reason is that tick.'
    );
    return false;
  }
  log.info(`[ad-worker] cancelling the enable-time scheduled run (${active.join(', ')})`);
  await fetch(
    spacePath(
      spaceId,
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions/cancel`
    ),
    { method: 'POST', headers: apiVersion(PUBLIC_API_VERSION) }
  );
  await waitUntilIdle({
    fetch,
    spaceId,
    workflowId,
    timeoutMs: cancelTimeoutMs,
    describeRace: 'The enable-time scheduled run of',
  });
  // The tick had started the runner as a child. Cancelling the parent does not by itself prove the
  // child has left its own cancel-in-progress slot, and a row's runner would race it there.
  await waitUntilIdle({
    fetch,
    spaceId,
    workflowId: RUNNER_WORKFLOW_ID,
    timeoutMs: cancelTimeoutMs,
    describeRace: 'The runner started by the enable-time scheduled run,',
  });
  return true;
};

/**
 * Enables the per-space floor worker, bound to its service account and set to manual autonomy,
 * so a run starts the way production starts it: the worker dispatches the runner as its
 * `run_as` identity. The enable-time scheduled run is cancelled before this returns (see
 * `settleEnableTimeRun`); the long schedule interval keeps any later tick out of the rows.
 */
export const enableFloorWorker = async ({
  fetch,
  log,
  serviceAccountId,
  spaceId = EVAL_SPACE_ID,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  serviceAccountId: string;
  spaceId?: string;
}): Promise<EnabledFloorWorker> => {
  const before = await readFloorWorker(fetch, spaceId);
  if ((before.blockingReasons ?? []).length > 0) {
    throw new Error(
      `The floor Attack Discovery worker is blocked in "${spaceId}": ${before.blockingReasons?.join(
        ', '
      )}.`
    );
  }
  const restore = async (): Promise<void> => {
    const current = await readFloorWorker(fetch, spaceId);
    if (before.enabled) {
      // Put back the settings the setup replaced, using the current revision.
      await patchFloorWorker(fetch, spaceId, {
        settingsRevision: current.settingsRevision ?? null,
        settings: before.settings,
      });
      log.info('[ad-worker] floor worker settings restored');
      return;
    }
    await patchFloorWorker(fetch, spaceId, { enabled: false });
    log.info(
      `[ad-worker] floor worker disabled again (revision ${String(current.settingsRevision)})`
    );
  };
  // The caller only receives `restore` when this resolves, so a failure from the PATCH onward must
  // put the worker back itself or it stays enabled in the eval space. The PATCH is inside the try
  // because one that times out may still have been applied; restoring a worker that never got
  // enabled is harmless.
  try {
    await patchFloorWorker(fetch, spaceId, {
      enabled: true,
      settingsRevision: before.settingsRevision ?? null,
      settings: {
        serviceAccountId,
        autonomy: 'manual',
        scheduleInterval: FLOOR_SCHEDULE_INTERVAL,
      },
    });
    const after = await readFloorWorker(fetch, spaceId);
    if (!after.enabled || !after.workflowId) {
      throw new Error(
        `The floor Attack Discovery worker did not enable in "${spaceId}" (enabled=${String(
          after.enabled
        )}, workflowId=${String(after.workflowId)}).`
      );
    }
    log.info(`[ad-worker] floor worker enabled as service account ${serviceAccountId}`);
    await settleEnableTimeRun({ fetch, log, workflowId: after.workflowId, spaceId });
    return { workflowId: after.workflowId, restore };
  } catch (error) {
    await restore().catch((restoreError) =>
      log.error(
        `[ad-worker] could not put the floor worker back after a failed enable: ${errorMessage(
          restoreError
        )}`
      )
    );
    throw error;
  }
};
