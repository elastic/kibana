/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import type { WorkerAutonomy } from '@kbn/security-evals-chain-safety';
import { ALERTZERO_API_VERSION, ALERTZERO_WORKERS_URL } from './constants';

/**
 * Space-aware request helper. Identity and space stay parameters (G20
 * t_10783950 runs a cell under a worker service account in a non-default
 * space): every request this harness makes goes through here, so a non-default
 * space is a URL-prefix change (`/s/{spaceId}/internal/...`, how Kibana routes
 * internal APIs per space), not a refactor. The authenticated identity is
 * whatever the fetch handler carries.
 */
export interface KbnRequestContext {
  fetch: HttpHandler;
  /** Kibana space id. Defaults to 'default' where the suite runs today. */
  spaceId: string;
}

export const spacePath = (spaceId: string, path: string): string =>
  spaceId && spaceId !== 'default' ? `/s/${encodeURIComponent(spaceId)}${path}` : path;

interface WorkerState {
  id: string;
  enabled: boolean;
  settingsRevision: number | null;
  settings: { autonomy?: string; serviceAccountId?: string };
  /** Installed per-space workflow id (`<workerId>-<space>`); null until installed. */
  workflowId?: string | null;
}

const listWorkers = async ({ fetch, spaceId }: KbnRequestContext): Promise<WorkerState[]> => {
  const { workers } = (await fetch(spacePath(spaceId, ALERTZERO_WORKERS_URL), {
    method: 'GET',
    version: ALERTZERO_API_VERSION,
    headers: { 'elastic-api-version': ALERTZERO_API_VERSION, 'kbn-xsrf': 'true' },
  } satisfies HttpFetchOptions)) as { workers: WorkerState[] };
  return workers ?? [];
};

const findWorker = async (ctx: KbnRequestContext, workerId: string): Promise<WorkerState> => {
  const worker = (await listWorkers(ctx)).find((w) => w.id === workerId);
  if (worker === undefined) {
    throw new Error(`Worker "${workerId}" is not registered; is the alertzero plugin enabled?`);
  }
  return worker;
};

/**
 * Patches a Worker's saved settings with exactly the fields given (strict
 * WorkerSettingsWrite: `autonomy` is a valid key; `workerId` is not — it is the
 * route param, never in the body). `settingsRevision` guards the write.
 */
const patchWorker = async (
  ctx: KbnRequestContext,
  workerId: string,
  body: { enabled?: boolean; settingsRevision: number | null; settings: Record<string, unknown> }
): Promise<void> => {
  await ctx.fetch(
    spacePath(ctx.spaceId, `${ALERTZERO_WORKERS_URL}/${encodeURIComponent(workerId)}`),
    {
      method: 'PATCH',
      version: ALERTZERO_API_VERSION,
      headers: { 'elastic-api-version': ALERTZERO_API_VERSION, 'kbn-xsrf': 'true' },
      body: JSON.stringify(body),
    } satisfies HttpFetchOptions
  );
};

/**
 * The id to POST /run for a Worker's workflow. Managed Worker workflows install
 * per space as `<workerId>-<spaceId>`, so the bare Worker id can 404; the
 * Workers list reports the installed id as `workflowId`. Falls back to
 * `fallbackWorkflowId` only when the Worker is not installed (null).
 */
export const resolveWorkerWorkflowId = async (
  ctx: KbnRequestContext,
  workerId: string,
  fallbackWorkflowId: string = workerId
): Promise<string> => (await findWorker(ctx, workerId)).workflowId ?? fallbackWorkflowId;

/**
 * Snapshot of a Worker's autonomy/enabled state, so a run can restore it in a
 * `finally` even when a later step fails (review B4).
 */
export interface WorkerAutonomySnapshot {
  workerId: string;
  enabled: boolean;
  settingsRevision: number | null;
  settings: { autonomy?: string; serviceAccountId?: string };
}

export const captureWorker = async (
  ctx: KbnRequestContext,
  workerId: string
): Promise<WorkerAutonomySnapshot> => {
  const worker = await findWorker(ctx, workerId);
  const { id, enabled, settingsRevision, settings } = worker;
  return { workerId: id, enabled, settingsRevision, settings: { ...settings } };
};

export const restoreWorker = async (
  ctx: KbnRequestContext,
  snapshot: WorkerAutonomySnapshot
): Promise<void> => {
  // Re-read the revision: it moved when we wrote. Restore the captured
  // autonomy (and enabled flag) exactly; failures are surfaced, not swallowed.
  const current = await findWorker(ctx, snapshot.workerId);
  await patchWorker(ctx, snapshot.workerId, {
    ...(snapshot.enabled !== current.enabled ? { enabled: snapshot.enabled } : {}),
    settingsRevision: current.settingsRevision,
    // N8: put the service account back too — writeWorkerAutonomy may have set it.
    // F6: when the snapshot had NONE, the run's write added one and the patch
    // merge would keep it; `serviceAccountId: null` is the contract's explicit
    // clear (applyWorkerSettingsWrite branches on undefined, not null).
    settings: {
      autonomy: snapshot.settings.autonomy,
      serviceAccountId:
        snapshot.settings.serviceAccountId !== undefined
          ? snapshot.settings.serviceAccountId
          : null,
    },
  });
};

/**
 * R4: PATCH enabled:true without a service account is rejected ("a worker
 * that is enabled without a service account"). Call once in beforeAll,
 * before any write: each Worker either already stores a service account or is
 * given the caller's `serviceAccountId`. Returns the effective id per Worker,
 * so the same value serves R1 (run-as attribution), R4 and G20.
 */
export const preflightWorkerServiceAccounts = async (
  ctx: KbnRequestContext,
  workerIds: readonly string[],
  /** One account for every Worker, or one per Worker id (as provisioned by the harness). */
  serviceAccountIds?: string | Readonly<Record<string, string>>
): Promise<Record<string, string>> => {
  const workers = await listWorkers(ctx);
  const effective: Record<string, string> = {};
  const missing: string[] = [];
  for (const workerId of workerIds) {
    const worker = workers.find((w) => w.id === workerId);
    if (worker === undefined) {
      throw new Error(`Worker "${workerId}" is not registered; is the alertzero plugin enabled?`);
    }
    const override =
      typeof serviceAccountIds === 'string' ? serviceAccountIds : serviceAccountIds?.[workerId];
    const resolved = override ?? worker.settings.serviceAccountId;
    if (resolved !== undefined) effective[workerId] = resolved;
    else missing.push(workerId);
  }
  if (missing.length > 0) {
    throw new Error(
      `No service account for Worker(s) ${missing.join(', ')}: enabling a Worker without ` +
        'settings.serviceAccountId is rejected. Set ALERTZERO_EVAL_SERVICE_ACCOUNT_ID to an ' +
        'enabled, assumable service account, or configure one on each Worker first.'
    );
  }
  return effective;
};

/**
 * Writes a Worker's saved autonomy setting (design Rev 3 §2): the harness
 * writes the setting itself before each run and records what the product then
 * reports via `readWorkerAutonomy`. Returns nothing — read back with
 * `readWorkerAutonomy` instead of trusting the declaration.
 *
 * `serviceAccountId` (R4) rides along so an enabling PATCH is accepted;
 * callers get it from `preflightWorkerServiceAccounts`.
 */
export const writeWorkerAutonomy = async (
  ctx: KbnRequestContext,
  workerId: string,
  autonomy: WorkerAutonomy,
  serviceAccountId?: string
): Promise<void> => {
  const worker = await findWorker(ctx, workerId);
  await patchWorker(ctx, workerId, {
    ...(worker.enabled ? {} : { enabled: true }),
    settingsRevision: worker.settingsRevision,
    settings: { autonomy, ...(serviceAccountId ? { serviceAccountId } : {}) },
  });
};

/** Reads back what the Worker actually stores — the record stores this, not the declaration. */
export const readWorkerAutonomy = async (
  ctx: KbnRequestContext,
  workerId: string
): Promise<{ autonomy?: string; settingsRevision: number | null; enabled: boolean }> => {
  const worker = await findWorker(ctx, workerId);
  return {
    autonomy: worker.settings.autonomy,
    settingsRevision: worker.settingsRevision,
    enabled: worker.enabled,
  };
};

/**
 * R1: the service account each given Worker runs as, read back from the
 * Workers API (`settings.serviceAccountId`). Managed Workers run as these
 * principals and auto-approvals attribute their decisions to them — never to
 * the identity calling /internal/security/me.
 */
export const readWorkerServiceAccountIds = async (
  ctx: KbnRequestContext,
  workerIds: readonly string[]
): Promise<Record<string, string | undefined>> => {
  const workers = await listWorkers(ctx);
  return Object.fromEntries(
    workerIds.map((workerId) => {
      const worker = workers.find((w) => w.id === workerId);
      if (worker === undefined) {
        throw new Error(`Worker "${workerId}" is not registered; is the alertzero plugin enabled?`);
      }
      return [workerId, worker.settings.serviceAccountId];
    })
  );
};

/**
 * Fails loudly when a Worker the harness just enabled has no installed per-space
 * workflow (`workflowId` null) or is not enabled. The Workers list reports
 * `workflowId: null` for a Worker that was never installed in the space, and a
 * run against it would otherwise fail much later with an opaque workflow 404.
 */
export const assertWorkerInstalled = async (
  ctx: KbnRequestContext,
  workerId: string
): Promise<string> => {
  const worker = await findWorker(ctx, workerId);
  if (!worker.workflowId || !worker.enabled) {
    throw new Error(
      `Worker "${workerId}" is not ready in space "${ctx.spaceId}" after the harness enabled it ` +
        `(workflowId=${worker.workflowId ?? 'null'}, enabled=${worker.enabled}): its per-space ` +
        'managed workflow is not installed. Check that xpack.security.serviceAccounts.enabled ' +
        'is true, that the Worker service account is enabled and assumable, and the Kibana ' +
        'server log for the install failure.'
    );
  }
  return worker.workflowId;
};
