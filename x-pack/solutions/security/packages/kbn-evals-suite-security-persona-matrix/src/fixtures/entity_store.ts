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
const START_URL = '/api/security/entity_store/start';
const STATUS_URL = '/api/security/entity_store/status';

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface EntityStoreStatusBody {
  status?: string;
  engines?: Array<{
    type?: string;
    status?: string | null;
    nonPriority?: { status?: string | null } | null;
  }>;
}

const getEntityStoreStatus = async (kbnClient: KbnClient): Promise<EntityStoreStatusBody> => {
  const response = await kbnClient.request<EntityStoreStatusBody>({
    path: STATUS_URL,
    method: 'GET',
    headers: COMMON_HEADERS,
  });
  return response.data;
};

/**
 * The aggregate status is `running` as soon as ANY engine is started, so it
 * cannot tell a fully running store from one with a stopped host/user engine.
 * Readiness therefore also requires that no engine (or its non-priority
 * process) reports `stopped`.
 */
const getStoppedEngineTypes = ({ engines = [] }: EntityStoreStatusBody): string[] =>
  engines
    .filter(({ status, nonPriority }) => status === 'stopped' || nonPriority?.status === 'stopped')
    .map(({ type }) => type ?? 'unknown');

const requestOrWarn = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  {
    path,
    method,
    headers,
    label,
  }: { path: string; method: 'POST' | 'PUT'; headers: Record<string, string>; label: string }
): Promise<void> => {
  try {
    await kbnClient.request({ path, method, headers, body: {} });
  } catch (err) {
    // The real signal is the status poll below; a failed request surfaces there
    // as a timeout naming the engines that never started.
    log.warning(
      `[persona-matrix] Entity Store ${label} request failed, polling status anyway: ${
        (err as Error).message
      }`
    );
  }
};

const ENTITY_TOOL_PATTERN = /^security\.(get_entity|search_entities)/;

/**
 * Whether any example expects an entity tool. Those tools are gated only on the store's index
 * existing, so after a successful install a failed start passes the tool pre-flight and would
 * score the examples against stopped engines; callers use this to fail the run instead.
 */
export const examplesNeedEntityStore = (
  examples: ReadonlyArray<{ metadata?: { expectedTools?: string[] } }>
): boolean =>
  examples.some(({ metadata }) =>
    (metadata?.expectedTools ?? []).some((toolId) => ENTITY_TOOL_PATTERN.test(toolId))
  );

/**
 * Ensures the Entity Store V2 engines are installed and started. The entity
 * analytics examples expect `security.get_entity` / `security.get_entity_*`
 * built-in tools, which are availability-gated on the store being installed;
 * nothing installs it on a fresh stack, so the suite does it itself.
 *
 * Install is a no-op (200) when every engine type already exists and does not
 * restart engines a previous run left stopped, so the start endpoint is always
 * called afterwards. Start only acts on stopped engines, which keeps the whole
 * sequence idempotent on an already running store.
 *
 * Both requests deliberately send an empty body, so the routes cover ALL
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
  log.info('[persona-matrix] installing and starting Entity Store');
  await requestOrWarn(kbnClient, log, {
    path: INSTALL_URL,
    method: 'POST',
    headers: INSTALL_HEADERS,
    label: 'install',
  });
  await requestOrWarn(kbnClient, log, {
    path: START_URL,
    method: 'PUT',
    headers: MUTATING_HEADERS,
    label: 'start',
  });

  const deadline = Date.now() + timeoutMs;
  // Failed status polls are not fatal (Kibana can briefly 503 mid-install), but
  // the timeout message keeps the last failure so a dead endpoint is diagnosable.
  let lastStatusError: string | undefined;
  let lastStatus: string | undefined;
  let stoppedEngines: string[] = [];
  while (Date.now() < deadline) {
    const body = await getEntityStoreStatus(kbnClient).catch((err: Error) => {
      lastStatusError = err.message;
      return undefined;
    });
    if (body) {
      lastStatus = body.status;
      stoppedEngines = getStoppedEngineTypes(body);
      if (body.status === 'error') {
        throw new Error('[persona-matrix] Entity Store is in error state');
      }
      if (body.status === 'running' && stoppedEngines.length === 0) {
        log.info('[persona-matrix] Entity Store is running');
        return;
      }
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `[persona-matrix] timed out after ${timeoutMs}ms waiting for Entity Store status=running` +
      ` with all engines started (last status: ${lastStatus ?? 'none'}; stopped engines: ${
        stoppedEngines.join(', ') || 'none'
      }; last status error: ${lastStatusError ?? 'none'})`
  );
};
