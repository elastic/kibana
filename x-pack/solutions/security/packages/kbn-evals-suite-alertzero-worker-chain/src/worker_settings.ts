/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { WorkerAutonomy } from '@kbn/security-evals-chain-safety';
import { ALERTZERO_API_VERSION, ALERTZERO_WORKERS_URL } from './constants';

/**
 * Space-aware request helper. Identity and space stay parameters (G20
 * t_10783950 runs a cell under a worker service account in a non-default
 * space): every request this harness makes goes through here, so a non-default
 * space is a header change, not a refactor.
 */
export interface KbnRequestContext {
  fetch: HttpHandler;
  /** Kibana space id. Defaults to 'default' where the suite runs today. */
  spaceId: string;
}

interface WorkerState {
  id: string;
  enabled: boolean;
  settingsRevision: number | null;
  settings: { autonomy?: string };
}

const listWorkers = async ({ fetch, spaceId }: KbnRequestContext): Promise<WorkerState[]> => {
  const { workers } = (await fetch(ALERTZERO_WORKERS_URL, {
    method: 'GET',
    version: ALERTZERO_API_VERSION,
    headers: { 'elastic-api-version': ALERTZERO_API_VERSION, 'kbn-xsrf': 'true' },
    ...(spaceId !== 'default' ? { space: spaceId } : {}),
  } as Parameters<HttpHandler>[1])) as { workers: WorkerState[] };
  return workers ?? [];
};

/**
 * Writes a Worker's saved autonomy setting. Triage autonomy is install-time
 * (`__WORKER_AUTONOMY_LEVEL__`), so it is applied by (re)installing the Worker
 * (design Rev 3 §2): the harness writes the setting itself before each run.
 * Returns the revision guard the next settings write must carry.
 */
export const writeWorkerAutonomy = async (
  ctx: KbnRequestContext,
  workerId: string,
  autonomy: WorkerAutonomy
): Promise<void> => {
  const workers = await listWorkers(ctx);
  const worker = workers.find((w) => w.id === workerId);
  if (worker === undefined) {
    throw new Error(`Worker "${workerId}" is not registered; is the alertzero plugin enabled?`);
  }
  await ctx.fetch(`${ALERTZERO_WORKERS_URL}/${encodeURIComponent(workerId)}`, {
    method: 'PATCH',
    version: ALERTZERO_API_VERSION,
    headers: { 'elastic-api-version': ALERTZERO_API_VERSION, 'kbn-xsrf': 'true' },
    body: JSON.stringify({
      ...(worker.enabled ? {} : { enabled: true }),
      settingsRevision: worker.settingsRevision,
      settings: { ...worker.settings, autonomy },
    }),
  } as Parameters<HttpHandler>[1]);
};

/** Reads back what the Worker actually stores — the record stores this, not the declaration. */
export const readWorkerAutonomy = async (
  ctx: KbnRequestContext,
  workerId: string
): Promise<{ autonomy?: string; settingsRevision: number | null; enabled: boolean }> => {
  const worker = (await listWorkers(ctx)).find((w) => w.id === workerId);
  if (worker === undefined) {
    throw new Error(`Worker "${workerId}" is not registered`);
  }
  return {
    autonomy: worker.settings?.autonomy,
    settingsRevision: worker.settingsRevision,
    enabled: worker.enabled,
  };
};
