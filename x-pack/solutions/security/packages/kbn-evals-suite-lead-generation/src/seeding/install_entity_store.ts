/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

const COMMON_HEADERS = {
  'elastic-api-version': '2023-10-31',
};

const MUTATING_HEADERS = {
  ...COMMON_HEADERS,
  'kbn-xsrf': 'true',
};

const INSTALL_HEADERS = {
  ...MUTATING_HEADERS,
  'x-elastic-internal-origin': 'Kibana',
};

const INSTALL_URL = '/api/security/entity_store/install';
const STATUS_URL = '/api/security/entity_store/status';

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const getEntityStoreStatus = async (kbnClient: KbnClient): Promise<string | undefined> => {
  const response = await kbnClient.request<{ status?: string }>({
    path: STATUS_URL,
    method: 'GET',
    headers: COMMON_HEADERS,
  });
  return response.data.status;
};

/**
 * Ensures the Entity Store V2 engine is installed and running, installing it
 * if necessary. The lead generation pipeline reads `entities-latest-{spaceId}`
 * unconditionally, so seeding requires the engine to exist first. Idempotent:
 * safe to call from every scenario's setup even if a previous scenario already
 * installed the engine.
 */
export const ensureEntityStoreRunning = async ({
  kbnClient,
  log,
  entityTypes = ['user', 'host', 'service'],
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  entityTypes?: string[];
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<void> => {
  const currentStatus = await getEntityStoreStatus(kbnClient).catch(() => undefined);
  if (currentStatus === 'running') {
    log.debug('[ensureEntityStoreRunning] Entity Store is already running');
    return;
  }

  log.info(
    `[ensureEntityStoreRunning] Installing Entity Store (entityTypes=${entityTypes.join(',')})`
  );
  try {
    await kbnClient.request({
      path: INSTALL_URL,
      method: 'POST',
      headers: INSTALL_HEADERS,
      body: { entityTypes },
    });
  } catch (err) {
    // The engine may already exist from a previous run; fall through to polling
    // rather than failing outright, since the real signal we care about is status.
    log.warning(
      `[ensureEntityStoreRunning] Install request failed, will still poll for status: ${
        (err as Error).message
      }`
    );
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getEntityStoreStatus(kbnClient).catch(() => undefined);
    if (status === 'error') {
      throw new Error('[ensureEntityStoreRunning] Entity Store is in error state');
    }
    if (status === 'running') {
      log.info('[ensureEntityStoreRunning] Entity Store is running');
      return;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `[ensureEntityStoreRunning] Timed out after ${timeoutMs}ms waiting for Entity Store status=running`
  );
};
