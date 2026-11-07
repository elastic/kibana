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
  REVIEW_WORKFLOW_ID,
  RUNNER_WORKFLOW_ID,
} from './constants';
import { assertFloorClean, isFloorClean, readFloorWorkflow } from './floor_parent';
import { apiVersion, errorMessage, httpStatus, sleep, spacePath } from './kibana_api';

export const FLOOR_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

/** The built-in service account (and, on stateful, the reserved role of the same name). */
export const FLOOR_SERVICE_ACCOUNT_NAME = WORKER_SERVICE_ACCOUNT_NAMES[FLOOR_WORKER_ID];

const LIST_PAGE_SIZE = 100;
const CONFLICT_LOOKUP_ATTEMPTS = 5;
const CONFLICT_LOOKUP_DELAY_MS = 500;
const REPAIR_NUDGE_INTERVAL = '25h';

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

const isFloorWorkflowClean = async (
  fetch: HttpHandler,
  spaceId: string,
  workflowId: string
): Promise<boolean> =>
  isFloorClean((await readFloorWorkflow({ fetch, spaceId, floorWorkflowId: workflowId })).yaml);

/**
 * Writes the floor worker's settings with the revision read just before, retrying once with a fresh
 * one on a 409 so a concurrent write does not leave the worker half put back. Other failures
 * rethrow.
 */
const patchFloorSettingsWithRetry = async (
  fetch: HttpHandler,
  spaceId: string,
  body: Record<string, unknown>
): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { settingsRevision } = await readFloorWorker(fetch, spaceId);
      await patchFloorWorker(fetch, spaceId, {
        settingsRevision: settingsRevision ?? null,
        ...body,
      });
      return;
    } catch (error) {
      if (httpStatus(error) !== 409) throw error;
      lastError = error;
    }
  }
  throw lastError;
};

/**
 * Re-renders the floor's YAML from the registry. A killed floor-parent run leaves its edit behind,
 * and the original cannot be rebuilt from it (its `${{ consts.* }}` inputs are gone). The managed
 * install skips a worker whose settings are unchanged (a disable/enable pair leaves the leftover in
 * place, verified live), so the repair changes one setting and sets it back: each write re-renders.
 *
 * Only call this while the worker is disabled: on a live worker the nudge can put the next tick in
 * the past and fire it. The writes carry no `enabled` key, so the worker stays disabled. If the
 * interval cannot be put back (the second write is tried twice) the error says what it was left at.
 */
const reRenderFloor = async ({
  fetch,
  spaceId,
  settings,
}: {
  fetch: HttpHandler;
  spaceId: string;
  settings: Record<string, unknown> | undefined;
}): Promise<void> => {
  const current = await readFloorWorker(fetch, spaceId);
  const interval = String(
    settings?.scheduleInterval ?? current.settings?.scheduleInterval ?? FLOOR_SCHEDULE_INTERVAL
  );
  const nudged = interval === REPAIR_NUDGE_INTERVAL ? '23h' : REPAIR_NUDGE_INTERVAL;
  await patchFloorWorker(fetch, spaceId, {
    settingsRevision: current.settingsRevision ?? null,
    settings: { scheduleInterval: nudged },
  });
  try {
    await patchFloorSettingsWithRetry(fetch, spaceId, {
      settings: settings ?? { scheduleInterval: interval },
    });
  } catch (error) {
    throw new Error(
      `Could not put the floor worker's schedule interval back to ${interval}: it is left at ${nudged} (${errorMessage(
        error
      )}).`,
      { cause: error }
    );
  }
};

/**
 * Throws unless the floor dispatches the runner. A leftover from an interrupted floor-parent run is
 * re-rendered (see `reRenderFloor`) and checked again. The worker must be disabled, so nothing can
 * dispatch the leftover meanwhile.
 */
const ensureFloorClean = async ({
  fetch,
  log,
  spaceId,
  workflowId,
  settings,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  spaceId: string;
  workflowId: string;
  settings: Record<string, unknown> | undefined;
}): Promise<void> => {
  if (await isFloorWorkflowClean(fetch, spaceId, workflowId)) return;
  log.warning(
    `[ad-worker] floor workflow "${workflowId}" is not dispatching the runner: an earlier run was interrupted while it was rewritten; re-rendering it from the registry`
  );
  await reRenderFloor({ fetch, spaceId, settings });
  const { yaml } = await readFloorWorkflow({ fetch, spaceId, floorWorkflowId: workflowId });
  assertFloorClean(workflowId, yaml);
  log.info('[ad-worker] floor workflow repaired');
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

export const listActiveExecutionIds = async (
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

/**
 * Cancels every active execution of a workflow in the space (the route is workflow-wide), so the
 * eval space must be dedicated. More than one means something besides the enable-time tick ran.
 */
const cancelActiveExecutions = async ({
  fetch,
  log,
  spaceId,
  workflowId,
  active,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  spaceId: string;
  workflowId: string;
  active: string[];
}): Promise<void> => {
  if (active.length > 1) {
    log.warning(
      `[ad-worker] cancelling ${
        active.length
      } active executions of "${workflowId}" in "${spaceId}" (${active.join(
        ', '
      )}); the cancel is workflow-wide, so the eval space must not be shared`
    );
  }
  await fetch(
    spacePath(
      spaceId,
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions/cancel`
    ),
    { method: 'POST', headers: apiVersion(PUBLIC_API_VERSION) }
  );
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
      `[ad-worker] no enable-time scheduled run appeared within ${waitMs}ms. A late ` +
        "scheduled tick can still cancel the first row's manual run (the floor workflow cancels " +
        'in progress, max 1), so a first row that is cancelled for no visible reason is that tick.'
    );
    return false;
  }
  log.info(`[ad-worker] cancelling the enable-time scheduled run (${active.join(', ')})`);
  await cancelActiveExecutions({ fetch, log, spaceId, workflowId, active });
  await waitUntilIdle({
    fetch,
    spaceId,
    workflowId,
    timeoutMs: cancelTimeoutMs,
    describeRace: 'The enable-time scheduled run of',
  });
  // The tick started the runner (or, on a floor left rewritten, the review) as a child. Cancelling
  // the parent does not prove the child left its cancel-in-progress slot, and a row's run would
  // race it there, so cancel it too.
  for (const childWorkflowId of [RUNNER_WORKFLOW_ID, REVIEW_WORKFLOW_ID]) {
    const childActive = await listActiveExecutionIds(fetch, spaceId, childWorkflowId);
    if (childActive.length > 0) {
      log.info(`[ad-worker] cancelling "${childWorkflowId}" started by the enable-time run`);
      await cancelActiveExecutions({
        fetch,
        log,
        spaceId,
        workflowId: childWorkflowId,
        active: childActive,
      });
    }
    await waitUntilIdle({
      fetch,
      spaceId,
      workflowId: childWorkflowId,
      timeoutMs: cancelTimeoutMs,
      describeRace: 'The child started by the enable-time scheduled run,',
    });
  }
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
  const enableSettings = {
    serviceAccountId,
    autonomy: 'manual',
    scheduleInterval: FLOOR_SCHEDULE_INTERVAL,
  };
  /** Set once the repair has disabled an enabled worker, so a failed `restore` can say so. */
  let disabledForRepair = false;
  /**
   * Re-renders a floor that an interrupted floor-parent run left rewritten, only while the worker
   * is disabled (an enabled one is disabled first), since on a live worker the write can fire a
   * tick that dispatches the leftover. Returns whether the floor was repaired; the worker is then
   * left disabled and its settings revision has moved, so the caller re-reads it and re-enables it
   * if needed.
   */
  const repairFloorWhileDisabled = async ({
    workflowId,
    enabled,
    settings,
  }: {
    workflowId: string;
    enabled: boolean;
    settings: Record<string, unknown> | undefined;
  }): Promise<boolean> => {
    if (await isFloorWorkflowClean(fetch, spaceId, workflowId)) return false;
    if (enabled) {
      // Set first: a disable that was applied but timed out must still be reported as left disabled.
      disabledForRepair = true;
      await patchFloorWorker(fetch, spaceId, { enabled: false });
      log.info('[ad-worker] floor worker disabled while its floor workflow is repaired');
    }
    await ensureFloorClean({ fetch, log, spaceId, workflowId, settings });
    return true;
  };
  const restore = async (): Promise<void> => {
    const current = await readFloorWorker(fetch, spaceId);
    const workflowId = current.workflowId ?? before.workflowId;
    // Neither an enable nor a disable re-renders the floor, so a leftover from a killed floor-parent
    // run is repaired here rather than handed to the next run, with the worker disabled meanwhile.
    disabledForRepair = false;
    let repaired = false;
    try {
      repaired = workflowId
        ? await repairFloorWhileDisabled({
            workflowId,
            enabled: current.enabled,
            settings: before.settings,
          })
        : false;
    } catch (error) {
      // A failed repair stops before the worker is enabled again, which is right: a worker that
      // would dispatch a leftover floor must stay off. Say so, since the eval was meant to put it back on.
      if (before.enabled && (disabledForRepair || !current.enabled)) {
        throw new Error(
          `${errorMessage(error)}; worker left disabled (was enabled before the eval)`,
          { cause: error }
        );
      }
      throw error;
    }
    // A worker the repair disabled is off, and one that was enabled before the setup and is off now
    // (the repair, or a failed enable) goes back on.
    const enabledNow = repaired ? false : current.enabled;
    const reEnable = before.enabled && !enabledNow;
    if (before.enabled) {
      // Put back the settings the setup replaced.
      await patchFloorSettingsWithRetry(fetch, spaceId, {
        settings: before.settings,
        ...(reEnable ? { enabled: true } : {}),
      });
      log.info('[ad-worker] floor worker settings restored');
      // Enabling again starts a scheduled run; it must not outlive the restore.
      if (reEnable && workflowId) await settleEnableTimeRun({ fetch, log, workflowId, spaceId });
    } else {
      await patchFloorWorker(fetch, spaceId, { enabled: false });
      log.info(
        `[ad-worker] floor worker disabled again (revision ${String(current.settingsRevision)})`
      );
    }
    if (!workflowId) return;
    const { yaml } = await readFloorWorkflow({ fetch, spaceId, floorWorkflowId: workflowId });
    assertFloorClean(workflowId, yaml);
  };
  // The caller only receives `restore` when this resolves, so a failure from the PATCH onward must
  // put the worker back itself or it stays enabled in the eval space. The PATCH is inside the try
  // because one that times out may still have been applied; restoring a worker that never got
  // enabled is harmless.
  try {
    // Repair before enabling: creating the scheduled task runs it at once, and a leftover floor
    // would dispatch whatever the dead run rewrote it to.
    const repaired = before.workflowId
      ? await repairFloorWhileDisabled({
          workflowId: before.workflowId,
          enabled: before.enabled,
          settings: enableSettings,
        })
      : false;
    const revision = repaired
      ? (await readFloorWorker(fetch, spaceId)).settingsRevision
      : before.settingsRevision;
    await patchFloorWorker(fetch, spaceId, {
      enabled: true,
      settingsRevision: revision ?? null,
      settings: enableSettings,
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
    const { yaml } = await readFloorWorkflow({
      fetch,
      spaceId,
      floorWorkflowId: after.workflowId,
    });
    assertFloorClean(after.workflowId, yaml);
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
