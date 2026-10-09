/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';

const COMMON_HEADERS = { 'elastic-api-version': '2023-10-31' };
const INSTALL_HEADERS = {
  ...COMMON_HEADERS,
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
};

const INSTALL_URL = '/api/security/entity_store/install';
const STATUS_URL = '/api/security/entity_store/status';

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const getEntityStoreStatus = async (fetch: HttpHandler): Promise<string | undefined> => {
  const response = await fetch<{ status?: string }>(STATUS_URL, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });
  return response.status;
};

/**
 * Ensures Entity Store is installed and running. No evaluator in this suite scores Entity
 * Store output — it is a prerequisite the Worker's hunt pipeline may read, installed idempotently
 * so the only known runtime prerequisite ambiguity (an uninitialized Entity Store) is removed.
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
  const currentStatus = await getEntityStoreStatus(fetch).catch(() => undefined);
  if (currentStatus === 'running') {
    log.debug('[hunt-watch] Entity Store is already running');
    return;
  }

  log.info('[hunt-watch] installing Entity Store');
  try {
    // The route's body schema requires an object (even if every field is optional), so an
    // omitted body fails validation with "expected object, received null".
    await fetch(INSTALL_URL, {
      method: 'POST',
      headers: INSTALL_HEADERS,
      body: JSON.stringify({}),
    });
  } catch (err) {
    // The engine may already exist from a previous run; fall through to polling rather than
    // failing outright, since the real signal we care about is status.
    log.warning(
      `[hunt-watch] Entity Store install request failed, will still poll for status: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getEntityStoreStatus(fetch).catch(() => undefined);
    if (status === 'error') {
      throw new Error('[hunt-watch] Entity Store is in error state');
    }
    if (status === 'running') {
      log.info('[hunt-watch] Entity Store is running');
      return;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `[hunt-watch] timed out after ${timeoutMs}ms waiting for Entity Store status=running`
  );
};
