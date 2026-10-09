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
  settings: { autonomy?: string };
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
 * Snapshot of a Worker's autonomy/enabled state, so a run can restore it in a
 * `finally` even when a later step fails (review B4).
 */
export interface WorkerAutonomySnapshot {
  workerId: string;
  enabled: boolean;
  settingsRevision: number | null;
  settings: { autonomy?: string };
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
    settings: { autonomy: snapshot.settings.autonomy },
  });
};

/**
 * Writes a Worker's saved autonomy setting (design Rev 3 §2): the harness
 * writes the setting itself before each run and records what the product then
 * reports via `readWorkerAutonomy`. Returns nothing — read back with
 * `readWorkerAutonomy` instead of trusting the declaration.
 */
export const writeWorkerAutonomy = async (
  ctx: KbnRequestContext,
  workerId: string,
  autonomy: WorkerAutonomy
): Promise<void> => {
  const worker = await findWorker(ctx, workerId);
  await patchWorker(ctx, workerId, {
    ...(worker.enabled ? {} : { enabled: true }),
    settingsRevision: worker.settingsRevision,
    settings: { autonomy },
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
