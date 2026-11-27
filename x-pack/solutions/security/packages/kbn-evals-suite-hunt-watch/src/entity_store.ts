/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { PUBLIC_API_VERSION } from './constants';
import { apiVersion, errorMessage, sleep } from './kibana_api';

const HEADERS = apiVersion(PUBLIC_API_VERSION);

const INSTALL_URL = '/api/security/entity_store/install';
const START_URL = '/api/security/entity_store/start';
const STATUS_URL = '/api/security/entity_store/status';

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 120_000;

interface EntityStoreStatusBody {
  status?: string;
  engines?: Array<{
    type?: string;
    status?: string | null;
    nonPriority?: { status?: string | null } | null;
  }>;
}

const getEntityStoreStatus = (fetch: HttpHandler): Promise<EntityStoreStatusBody> =>
  fetch<EntityStoreStatusBody>(STATUS_URL, { method: 'GET', headers: HEADERS });

/**
 * The aggregate status is `running` as soon as ANY engine is started, so it cannot tell a fully
 * running store from one with a stopped host/user engine. Readiness therefore also requires that
 * no engine (or its non-priority process) reports `stopped`.
 */
const getStoppedEngineTypes = ({ engines = [] }: EntityStoreStatusBody): string[] =>
  engines
    .filter(({ status, nonPriority }) => status === 'stopped' || nonPriority?.status === 'stopped')
    .map(({ type }) => type ?? 'unknown');

const requestOrWarn = async (
  fetch: HttpHandler,
  log: ToolingLog,
  { path, method, label }: { path: string; method: 'POST' | 'PUT'; label: string }
): Promise<void> => {
  try {
    // The route's body schema requires an object (even if every field is optional), so an
    // omitted body fails validation with "expected object, received null".
    await fetch(path, { method, headers: HEADERS, body: JSON.stringify({}) });
  } catch (err) {
    // The real signal is the status poll below; a failed request surfaces there as a timeout
    // naming the engines that never started.
    log.warning(
      `[hunt-watch] Entity Store ${label} request failed, will still poll for status: ${errorMessage(
        err
      )}`
    );
  }
};

/**
 * Ensures Entity Store is installed and running. No evaluator in this suite scores Entity
 * Store output — it is a prerequisite the Worker's hunt pipeline may read, installed idempotently
 * so the only known runtime prerequisite ambiguity (an uninitialized Entity Store) is removed.
 *
 * Install is a no-op when every engine type already exists and does not restart engines a
 * previous run left stopped, so start is always called afterwards. Start only acts on stopped
 * engines, which keeps the sequence idempotent on an already running store.
 */
export const ensureEntityStoreRunning = async ({
  fetch,
  log,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<void> => {
  log.info('[hunt-watch] installing and starting Entity Store');
  await requestOrWarn(fetch, log, { path: INSTALL_URL, method: 'POST', label: 'install' });
  await requestOrWarn(fetch, log, { path: START_URL, method: 'PUT', label: 'start' });

  const deadline = Date.now() + timeoutMs;
  let lastStatus: string | undefined;
  let lastStatusError: string | undefined;
  let stoppedEngines: string[] = [];
  while (Date.now() < deadline) {
    // Failed status polls are not fatal (Kibana can briefly 503 mid-install), but the timeout
    // message keeps the last failure so a dead endpoint is diagnosable.
    const body = await getEntityStoreStatus(fetch).catch((err: unknown) => {
      lastStatusError = errorMessage(err);
      return undefined;
    });
    if (body) {
      lastStatus = body.status;
      stoppedEngines = getStoppedEngineTypes(body);
      if (body.status === 'error') {
        throw new Error('[hunt-watch] Entity Store is in error state');
      }
      if (body.status === 'running' && stoppedEngines.length === 0) {
        log.info('[hunt-watch] Entity Store is running');
        return;
      }
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `[hunt-watch] timed out after ${timeoutMs}ms waiting for Entity Store status=running` +
      ` with all engines started (last status: ${lastStatus ?? 'none'}; stopped engines: ${
        stoppedEngines.join(', ') || 'none'
      }; last status error: ${lastStatusError ?? 'none'})`
  );
};
