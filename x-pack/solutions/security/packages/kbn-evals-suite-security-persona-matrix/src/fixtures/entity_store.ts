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
 * Ensures the Entity Store V2 engine is installed and running. The entity
 * analytics examples expect `security.get_entity` / `security.get_entity_*`
 * built-in tools, which are availability-gated on the store being installed;
 * nothing installs it on a fresh stack, so the suite does it itself. Idempotent
 * and safe to call when the store is already installed (the endpoint answers
 * 200 with the existing state).
 *
 * The install deliberately sends an empty body, so the route installs ALL
 * entity types rather than the lead-generation sibling's ['user','host','service']
 * subset: the matrix expects the full availability surface across future
 * examples, and installing extra engine types is idempotent and harmless.
 */
export const ensureEntityStoreRunning = async ({
  kbnClient,
  log,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<void> => {
  const currentStatus = await getEntityStoreStatus(kbnClient).catch(() => undefined);
  if (currentStatus === 'running') {
    log.debug('[persona-matrix] Entity Store is already running');
    return;
  }

  log.info('[persona-matrix] installing Entity Store');
  try {
    await kbnClient.request({
      path: INSTALL_URL,
      method: 'POST',
      headers: INSTALL_HEADERS,
      body: {},
    });
  } catch (err) {
    // The engine may already exist from a previous run; the real signal is the
    // status, so fall through to polling instead of failing outright.
    log.warning(
      `[persona-matrix] Entity Store install request failed, polling status anyway: ${
        (err as Error).message
      }`
    );
  }

  const deadline = Date.now() + timeoutMs;
  // Failed status polls are not fatal (Kibana can briefly 503 mid-install), but
  // the timeout message keeps the last failure so a dead endpoint is diagnosable.
  let lastStatusError: string | undefined;
  while (Date.now() < deadline) {
    const status = await getEntityStoreStatus(kbnClient).catch((err: Error) => {
      lastStatusError = err.message;
      return undefined;
    });
    if (status === 'error') {
      throw new Error('[persona-matrix] Entity Store is in error state');
    }
    if (status === 'running') {
      log.info('[persona-matrix] Entity Store is running');
      return;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `[persona-matrix] timed out after ${timeoutMs}ms waiting for Entity Store status=running` +
      ` (last status error: ${lastStatusError ?? 'none'})`
  );
};
