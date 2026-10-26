/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture } from '@kbn/scout-security';
import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import {
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  SECURITY_SERVICE_ACCOUNT_URL,
  buildServiceAccountUrl,
  buildWorkerUrl,
  getWorkerRoleName,
  WORKER_SERVICE_ACCOUNT_NAMES,
} from '@kbn/alertzero-common';

/** Poll interval for bounded waits inside specs (server-side settle can take seconds). */
export const POLL_INTERVAL_MS = 2_000;

export type Headers = Record<string, string>;
export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiResult<T> {
  statusCode: number;
  body: T;
}

/**
 * Kibana API calls as the logged-in user. `internal` adds the internal-origin
 * headers the alertzero routes require (`restrictInternalApis=true` on this
 * config set); `public` sends only what the caller provides; `raw` takes full
 * control for versioned routes that need their own header set.
 */
export interface AlertZeroApi {
  internal: <T = unknown>(
    method: Method,
    path: string,
    options?: { body?: unknown }
  ) => Promise<ApiResult<T>>;
  public: <T = unknown>(
    method: Method,
    path: string,
    options?: { body?: unknown }
  ) => Promise<ApiResult<T>>;
  raw: <T = unknown>(
    method: Method,
    path: string,
    headers: Headers,
    body?: unknown
  ) => Promise<ApiResult<T>>;
}

export const createApi = (apiClient: ApiClientFixture, cookieHeader: Headers): AlertZeroApi => {
  const send = async <T>(
    method: Method,
    path: string,
    headers: Headers,
    body?: unknown
  ): Promise<ApiResult<T>> => {
    const response = await apiClient[method.toLowerCase() as Lowercase<Method>]<T>(path, {
      headers: { ...cookieHeader, ...headers },
      body,
      responseType: 'json',
    });
    return { statusCode: response.statusCode, body: response.body };
  };
  const internalHeaders = {
    ...INTERNAL_API_HEADERS,
    'kbn-xsrf': 'some-xsrf-token',
  };
  // Public mutating routes (e.g. actions connector create/delete) reject requests
  // without kbn-xsrf; GETs ignore it, so it is safe on every public call.
  const publicHeaders = {
    'kbn-xsrf': 'some-xsrf-token',
    'Content-Type': 'application/json;charset=UTF-8',
  };

  return {
    internal: (method, path, options) => send(method, path, internalHeaders, options?.body),
    public: (method, path, options) => send(method, path, publicHeaders, options?.body),
    raw: (method, path, headers, body) => send(method, path, headers, body),
  };
};

/** Resolves with the body of a 2xx response; anything else fails with the status and body. */
export const ok = <T>(result: ApiResult<T>, label: string): T => {
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`${label} failed: ${result.statusCode} ${JSON.stringify(result.body)}`);
  }
  return result.body;
};

/** Bounded polling: resolves with the first non-undefined `read` value; timeout throws. */
export const pollUntil = async <T>(
  label: string,
  read: () => Promise<T | undefined>,
  { timeoutMs, intervalMs = POLL_INTERVAL_MS }: { timeoutMs: number; intervalMs?: number }
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  for (;;) {
    try {
      const value = await read();
      if (value !== undefined) return value;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for ${label}${
          lastError === undefined ? '' : `; last error: ${String(lastError)}`
        }`
      );
    }
    const wait = Math.min(intervalMs, Math.max(0, deadline - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
};

/** Prefixes a path with `/s/<spaceId>` for a non-default Space. */
export const spaceUrl = (path: string, spaceId?: string): string => {
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}/${trimmed}` : `/${trimmed}`;
};

const helperError = (label: string, response: ApiResult<unknown>): never => {
  throw new Error(
    `Setup: failed to ${label} (status ${response.statusCode}): ${JSON.stringify(response.body)}`
  );
};

// ---------------------------------------------------------------------------
// Worker state
// ---------------------------------------------------------------------------

export interface WorkerInfo {
  id: string;
  enabled: boolean;
  blockingReasons?: string[];
  settingsRevision?: number | null;
  settings?: { serviceAccountId?: string };
}

export interface WorkersResponse {
  workers: Array<{
    id: string;
    enabled: boolean;
    blockingReasons?: string[];
    settingsRevision?: number | null;
    settings?: { serviceAccountId?: string };
  }>;
}

/** Server-visible predicate: a worker whose enablement the server will refuse. */
export const isWorkerEnableBlocked = (worker: Pick<WorkerInfo, 'blockingReasons'>): boolean =>
  (worker.blockingReasons ?? []).includes('no_model');

/** GET the worker list in a space. */
export const listWorkers = async (api: AlertZeroApi, spaceId: string): Promise<WorkerInfo[]> => {
  const { workers } = ok<WorkersResponse>(
    await api.internal('GET', spaceUrl(ALERTZERO_WORKERS_URL, spaceId)),
    `list workers in ${spaceId}`
  );
  return workers;
};

/**
 * PATCH one worker. `settingsRevision` is required by the server when `settings`
 * is present (read it from the list response); enable/disable alone sends just
 * `enabled`.
 */
export const patchWorker = async (
  api: AlertZeroApi,
  spaceId: string,
  workerId: string,
  body: {
    enabled?: boolean;
    settingsRevision?: number | null;
    settings?: { serviceAccountId?: string };
  }
): Promise<ApiResult<unknown>> =>
  api.internal('PATCH', spaceUrl(buildWorkerUrl(workerId), spaceId), { body });

// ---------------------------------------------------------------------------
// Per-space gate
// ---------------------------------------------------------------------------

const KIBANA_SETTINGS_PATH = 'internal/kibana/settings';

export const setAlertZeroEnabledInSpace = async (
  api: AlertZeroApi,
  spaceId: string,
  enabled: boolean | undefined
): Promise<void> => {
  const response = await api.internal('POST', spaceUrl(KIBANA_SETTINGS_PATH, spaceId), {
    body: { changes: { [ALERTZERO_ENABLED_SETTING_ID]: enabled ?? null } },
  });
  if (response.statusCode !== 200) {
    helperError(`set AlertZero enabled=${String(enabled)} in ${spaceId}`, response);
  }
};

// ---------------------------------------------------------------------------
// Service accounts (global — no space prefix; created by the onboarding UI flow)
// ---------------------------------------------------------------------------

/**
 * Creates the throwaway service account the enable PATCH requires. Mirrors the UI's
 * `ensureWorkerServiceAccounts` (roles from the built-in worker-role registry), but
 * with a unique name so parallel/failed runs cannot collide on the reserved name.
 */
export const createWorkerServiceAccount = async (
  api: AlertZeroApi,
  workerId: string
): Promise<{ id: string; cleanup: () => Promise<void> }> => {
  const accountName = WORKER_SERVICE_ACCOUNT_NAMES[workerId];
  if (!accountName) {
    throw new Error(`No service-account name registered for worker ${workerId}`);
  }
  const roleName = getWorkerRoleName(accountName, { isServerless: false });
  const created = await api.internal<{ id: string }>('POST', SECURITY_SERVICE_ACCOUNT_URL, {
    body: {
      name: `${accountName}_scout_${uniqueSuffix()}`.slice(0, 50),
      description: 'Scout AlertZero onboarding e2e',
      roles: [roleName],
    },
  });
  if (created.statusCode !== 200 || !created.body?.id) {
    helperError(`create service account for ${workerId}`, created);
  }
  const { id } = created.body;
  return {
    id,
    cleanup: async () => {
      // `?force=true` revokes API keys first; 404 means another run already removed it.
      const deleted = await api.internal('DELETE', `${buildServiceAccountUrl(id)}?force=true`);
      if (deleted.statusCode !== 200 && deleted.statusCode !== 204 && deleted.statusCode !== 404) {
        helperError(`delete service account ${id}`, deleted);
      }
    },
  };
};

// ---------------------------------------------------------------------------
// Stub model (plumbing-only enabler — connector is never invoked)
// ---------------------------------------------------------------------------

interface InferenceSettingsResponse {
  data: {
    features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }>;
  };
}

const SEARCH_INFERENCE_SETTINGS_PATH = '/internal/search_inference_endpoints/settings';
const SEARCH_INFERENCE_API_VERSION = '1';

/** Unique per call; names a connector, so `randomUUID` rather than `Math.random`. */
const uniqueSuffix = () => `${Date.now()}-${randomUUID().slice(0, 8)}`;

export interface StubModel {
  connectorId: string;
  cleanup: () => Promise<void>;
}

/**
 * Seeds the space-scoped stub `.gen-ai` connector the onboarding UI needs before it
 * unlocks worker toggles (pattern: `test/scout_alertzero/api/fixtures/helpers.ts`
 * `setupHuntPrerequisites`, minus the Hunt-specific service account). The connector
 * is never invoked — enablement only checks endpoint existence. Cleanup restores the
 * inference-settings document (PUT back the pre-test features) and deletes the
 * connector, so `getForFeature` is not polluted for sibling specs.
 */
export const seedStubModel = async (api: AlertZeroApi, spaceId: string): Promise<StubModel> => {
  const suffix = uniqueSuffix();
  const connectorName = `scout-onboarding-genai-${spaceId}-${suffix}`;

  const createdConnector = await api.public('POST', spaceUrl('api/actions/connector', spaceId), {
    body: {
      name: connectorName,
      connector_type_id: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: 'https://example.invalid/v1',
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'scout-test-key' },
    },
  });
  if (createdConnector.statusCode !== 200 || !(createdConnector.body as { id?: string }).id) {
    helperError(`create .gen-ai connector in ${spaceId}`, createdConnector);
  }
  const connectorId = (createdConnector.body as { id: string }).id;

  const settingsHeaders: Headers = {
    'kbn-xsrf': 'some-xsrf-token',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': SEARCH_INFERENCE_API_VERSION,
  };
  const settingsGet = await api.raw<InferenceSettingsResponse>(
    'GET',
    spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId),
    settingsHeaders
  );
  if (settingsGet.statusCode !== 200) {
    helperError(`read inference settings in ${spaceId}`, settingsGet);
  }
  const existingFeatures = settingsGet.body.data?.features ?? [];
  const parent = existingFeatures.find(
    (f) => f.feature_id === ALERTZERO_INFERENCE_PARENT_FEATURE_ID
  );
  const assigned = !parent || parent.endpoints.length === 0;
  if (assigned) {
    const put = await api.raw(
      'PUT',
      spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId),
      settingsHeaders,
      {
        features: [
          ...existingFeatures.filter((f) => f.feature_id !== ALERTZERO_INFERENCE_PARENT_FEATURE_ID),
          {
            feature_id: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
            endpoints: [{ id: connectorId }],
          },
        ],
      }
    );
    if (put.statusCode !== 200) {
      helperError(`assign stub model in ${spaceId}`, put);
    }
  }

  const cleanup = async () => {
    if (assigned) {
      const restore = await api.raw(
        'PUT',
        spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId),
        settingsHeaders,
        { features: existingFeatures }
      );
      if (restore.statusCode !== 200) {
        helperError(`restore inference settings in ${spaceId}`, restore);
      }
    }
    const deleteConnector = await api.public(
      'DELETE',
      spaceUrl(`api/actions/connector/${encodeURIComponent(connectorId)}`, spaceId)
    );
    if (
      deleteConnector.statusCode !== 200 &&
      deleteConnector.statusCode !== 204 &&
      deleteConnector.statusCode !== 404
    ) {
      helperError(`delete stub connector ${connectorId}`, deleteConnector);
    }
  };

  return { connectorId, cleanup };
};
