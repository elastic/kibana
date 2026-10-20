/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture } from '@kbn/scout-security';
import {
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  buildServiceAccountUrl,
  getWorkerRoleName,
  HUNT_THREAT_INTEL_SUPPLY_URL,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  type HuntThreatIntelSupplyStatus,
} from '@kbn/alertzero-common';
import { THREAT_REPORTS_INDEX } from '../../../../common/threat_intel';
import { HUNT_WORKER_URL, TI_HEADERS } from './constants';
import { SUPPLY_WORKFLOW_IDS, type SupplyWorkflowKey } from './supply_workflow_ids';

/** Minimal ES client surface these tests rely on. */
interface EsLike {
  deleteByQuery(args: {
    index: string;
    query: Record<string, unknown>;
    refresh?: boolean;
    ignore_unavailable?: boolean;
    conflicts?: 'proceed' | 'abort';
  }): Promise<unknown>;
  index(args: {
    index: string;
    id: string;
    document: Record<string, unknown>;
    refresh?: boolean;
  }): Promise<unknown>;
}

/**
 * Runs every cleanup step even when an earlier one throws, then rethrows the failures
 * together, so one broken teardown cannot leak spaces or shared settings into later specs.
 */
export const runCleanupSteps = async (
  steps: ReadonlyArray<{ name: string; run: () => Promise<unknown> }>
): Promise<void> => {
  const failures: string[] = [];
  for (const { name, run } of steps) {
    try {
      await run();
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Cleanup failed:\n${failures.join('\n')}`);
  }
};

/**
 * Remove only the specific threat reports created by this suite run.
 * Scoped to IDs (not adapter_id) so parallel runs or real users on a shared
 * cluster are not affected.
 */
export const cleanupThreatReportsByIds = async (esClient: EsLike, ids: string[]) => {
  if (ids.length === 0) return;
  await esClient.deleteByQuery({
    index: THREAT_REPORTS_INDEX,
    query: { ids: { values: ids } },
    refresh: true,
    ignore_unavailable: true,
    conflicts: 'proceed',
  });
};

/** Prefixes a path with `/s/<spaceId>` for a non-default Space. */
export const spaceUrl = (path: string, spaceId?: string): string => {
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}/${trimmed}` : `/${trimmed}`;
};

export interface SupplyWorkflowRow {
  key: string;
  enabled: boolean;
  installed: boolean;
  scope: string;
  inUseElsewhere?: boolean;
}

export type SupplyStatusBody = HuntThreatIntelSupplyStatus;

/** GET Hunt threat-intel supply status for a space. */
export const readSupplyStatus = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  spaceId: string
): Promise<{ statusCode: number; body: SupplyStatusBody }> => {
  const response = await apiClient.get(spaceUrl(HUNT_THREAT_INTEL_SUPPLY_URL, spaceId), {
    headers,
    responseType: 'json',
  });
  return { statusCode: response.statusCode, body: response.body as SupplyStatusBody };
};

const SEARCH_INFERENCE_SETTINGS_PATH = '/internal/search_inference_endpoints/settings';
const SEARCH_INFERENCE_API_VERSION = '1';

interface InferenceSettingsResponse {
  data: {
    features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }>;
  };
}

/** Unique per call; `randomUUID` rather than `Math.random` since the suffix names a service account. */
const uniqueSuffix = () => `${Date.now()}-${randomUUID().slice(0, 8)}`;

export interface HuntPrerequisites {
  connectorId: string;
  serviceAccountId: string;
  cleanup: () => Promise<void>;
}

const KIBANA_SETTINGS_PATH = 'internal/kibana/settings';

/** Reads the per-space AlertZero gate as the user set it; `undefined` when it is still the default. */
export const readAlertZeroEnabledInSpace = async ({
  apiClient,
  headers,
  spaceId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}): Promise<boolean | undefined> => {
  const response = await apiClient.get(spaceUrl(KIBANA_SETTINGS_PATH, spaceId), {
    headers,
    responseType: 'json',
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Setup: failed to read settings in ${spaceId} (status ${
        response.statusCode
      }): ${JSON.stringify(response.body)}`
    );
  }
  const settings = (response.body as { settings?: Record<string, { userValue?: unknown }> })
    .settings;
  const userValue = settings?.[ALERTZERO_ENABLED_SETTING_ID]?.userValue;
  return typeof userValue === 'boolean' ? userValue : undefined;
};

/**
 * Sets the per-space AlertZero gate. `true` makes hunt/worker routes stop 404ing;
 * `undefined` clears the user value so the space goes back to the default.
 */
export const setAlertZeroEnabledInSpace = async ({
  apiClient,
  headers,
  spaceId,
  enabled,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
  enabled: boolean | undefined;
}): Promise<void> => {
  const response = await apiClient.post(spaceUrl(KIBANA_SETTINGS_PATH, spaceId), {
    headers: { ...headers, 'kbn-xsrf': 'true' },
    responseType: 'json',
    body: { changes: { [ALERTZERO_ENABLED_SETTING_ID]: enabled ?? null } },
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Setup: failed to set AlertZero enabled=${String(enabled)} in ${spaceId} (status ${
        response.statusCode
      }): ${JSON.stringify(response.body)}`
    );
  }
};

/** Turns on the per-space AlertZero gate so hunt/worker routes stop 404ing. */
export const enableAlertZeroInSpace = async (args: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}): Promise<void> => setAlertZeroEnabledInSpace({ ...args, enabled: true });

/**
 * Creates a space-scoped `.gen-ai` connector (so Workers are not blocked by `noModel`),
 * assigns it to the AlertZero parent inference feature when getForFeature would otherwise
 * see nothing, and creates a uniquely named service account that holds the Hunt Worker's
 * built-in role (not the built-in account itself, which two spaces would race on).
 */
export const setupHuntPrerequisites = async ({
  apiClient,
  headers,
  spaceId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}): Promise<HuntPrerequisites> => {
  await enableAlertZeroInSpace({ apiClient, headers, spaceId });

  const suffix = uniqueSuffix();
  const connectorName = `scout-hunt-genai-${spaceId}-${suffix}`;

  const createdConnector = await apiClient.post(spaceUrl('api/actions/connector', spaceId), {
    headers: { ...headers, 'kbn-xsrf': 'true' },
    responseType: 'json',
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
    throw new Error(
      `Setup: failed to create .gen-ai connector in ${spaceId} (status ${
        createdConnector.statusCode
      }): ${JSON.stringify(createdConnector.body)}`
    );
  }
  const connectorId = (createdConnector.body as { id: string }).id;

  const settingsHeaders = {
    ...headers,
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': SEARCH_INFERENCE_API_VERSION,
  };
  const settingsGet = await apiClient.get(spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId), {
    headers: settingsHeaders,
    responseType: 'json',
  });
  if (settingsGet.statusCode !== 200) {
    throw new Error(
      `Setup: failed to read inference settings in ${spaceId} (status ${
        settingsGet.statusCode
      }): ${JSON.stringify(settingsGet.body)}`
    );
  }
  const settingsBody = settingsGet.body as InferenceSettingsResponse;
  const existingFeatures = settingsBody.data?.features ?? [];
  const parent = existingFeatures.find(
    (f) => f.feature_id === ALERTZERO_INFERENCE_PARENT_FEATURE_ID
  );
  if (!parent || parent.endpoints.length === 0) {
    const put = await apiClient.put(spaceUrl(SEARCH_INFERENCE_SETTINGS_PATH, spaceId), {
      headers: settingsHeaders,
      responseType: 'json',
      body: {
        features: [
          ...existingFeatures.filter((f) => f.feature_id !== ALERTZERO_INFERENCE_PARENT_FEATURE_ID),
          {
            feature_id: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
            endpoints: [{ id: connectorId }],
          },
        ],
      },
    });
    if (put.statusCode !== 200) {
      throw new Error(
        `Setup: failed to assign AlertZero parent inference endpoint in ${spaceId} (status ${
          put.statusCode
        }): ${JSON.stringify(put.body)}`
      );
    }
  }

  const accountName =
    WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID];
  const roleName = getWorkerRoleName(accountName, { isServerless: false });
  // Unique per space/run so two spaces do not race on the same reserved account name when
  // the built-in account already exists from a prior failed cleanup.
  const scoutAccountName = `${accountName}_scout_${suffix}`.slice(0, 50);
  const createdAccount = await apiClient.post(SECURITY_SERVICE_ACCOUNT_URL, {
    headers: {
      ...headers,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
    },
    responseType: 'json',
    body: {
      name: scoutAccountName,
      description: `Scout Hunt Watch prerequisites (${spaceId})`,
      roles: [roleName],
    },
  });
  if (createdAccount.statusCode !== 200 || !(createdAccount.body as { id?: string }).id) {
    throw new Error(
      `Setup: failed to create service account (status ${
        createdAccount.statusCode
      }): ${JSON.stringify(createdAccount.body)}`
    );
  }
  const serviceAccountId = (createdAccount.body as { id: string }).id;

  const cleanup = async () => {
    const failures: string[] = [];
    const deleteAccount = await apiClient.delete(
      `${buildServiceAccountUrl(serviceAccountId)}?force=true`,
      {
        headers: {
          ...headers,
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
        },
        responseType: 'json',
      }
    );
    if (
      deleteAccount.statusCode !== 200 &&
      deleteAccount.statusCode !== 204 &&
      deleteAccount.statusCode !== 404
    ) {
      failures.push(
        `service account ${serviceAccountId}: status ${deleteAccount.statusCode} ${JSON.stringify(
          deleteAccount.body
        )}`
      );
    }
    const deleteConnector = await apiClient.delete(
      spaceUrl(`api/actions/connector/${encodeURIComponent(connectorId)}`, spaceId),
      {
        headers: { ...headers, 'kbn-xsrf': 'true' },
        responseType: 'json',
      }
    );
    if (
      deleteConnector.statusCode !== 200 &&
      deleteConnector.statusCode !== 204 &&
      deleteConnector.statusCode !== 404
    ) {
      failures.push(
        `connector ${connectorId}: status ${deleteConnector.statusCode} ${JSON.stringify(
          deleteConnector.body
        )}`
      );
    }
    if (failures.length > 0) {
      throw new Error(`Hunt prerequisites cleanup failed:\n${failures.join('\n')}`);
    }
  };

  return { connectorId, serviceAccountId, cleanup };
};

/** PATCH Continuous Threat Hunt enabled/disabled in a space. */
export const setHuntEnabled = async ({
  apiClient,
  headers,
  spaceId,
  enabled,
  serviceAccountId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
  enabled: boolean;
  serviceAccountId?: string;
}): Promise<{ statusCode: number; body: unknown }> => {
  const listed = await apiClient.get(spaceUrl(ALERTZERO_WORKERS_URL, spaceId), {
    headers,
    responseType: 'json',
  });
  if (listed.statusCode !== 200) {
    throw new Error(
      `Failed to list workers in ${spaceId} (status ${listed.statusCode}): ${JSON.stringify(
        listed.body
      )}`
    );
  }
  const workers = (
    listed.body as { workers: Array<{ id: string; settingsRevision: number | null }> }
  ).workers;
  const current = workers.find(
    (w) => w.id === SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
  );
  const body: Record<string, unknown> = {
    enabled,
    settingsRevision: current?.settingsRevision ?? null,
  };
  if (enabled) {
    if (!serviceAccountId) {
      throw new Error('setHuntEnabled(true) requires serviceAccountId');
    }
    body.settings = { serviceAccountId };
  }
  const response = await apiClient.patch(spaceUrl(HUNT_WORKER_URL, spaceId), {
    headers,
    responseType: 'json',
    body,
  });
  return { statusCode: response.statusCode, body: response.body };
};

/**
 * Flip a deployment-wide supply managed workflow (ingest or enrich) on or off through
 * the Workflows API, bypassing the Hunt coupling. Both live in the default space.
 */
export const setSupplyWorkflowEnabled = async ({
  apiClient,
  headers,
  key,
  enabled,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  key: SupplyWorkflowKey;
  enabled: boolean;
}): Promise<{ statusCode: number; body: unknown }> => {
  const response = await apiClient.put(
    `/api/workflows/managed/workflow/${encodeURIComponent(SUPPLY_WORKFLOW_IDS[key])}`,
    {
      headers: {
        ...headers,
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
      },
      responseType: 'json',
      body: { enabled },
    }
  );
  return { statusCode: response.statusCode, body: response.body };
};

/**
 * Seed a shared (`space_id: '*'`) report with two per-space evidence elements.
 * `sourceName` lets a spec narrow `find_threat_reports` to this report on a shared cluster.
 */
export const seedSharedReportWithEvidence = async ({
  esClient,
  reportId,
  sourceName,
  spaceA,
  spaceB,
}: {
  esClient: EsLike;
  reportId: string;
  sourceName: string;
  spaceA: string;
  spaceB: string;
}): Promise<void> => {
  await esClient.index({
    index: THREAT_REPORTS_INDEX,
    id: reportId,
    refresh: true,
    document: {
      space_id: '*',
      source: { name: sourceName },
      content: {
        title: `Scout isolation ${reportId}`,
        body_text: `Shared report for evidence projection ${reportId}`,
      },
      evidence: [
        {
          space_id: spaceA,
          alert_hits: { window: '7d', ioc_match_hits: 1, technique_overlap_hits: 0 },
          alert_hits_total: 1,
        },
        {
          space_id: spaceB,
          alert_hits: { window: '7d', ioc_match_hits: 9, technique_overlap_hits: 1 },
          alert_hits_total: 10,
        },
      ],
    },
  });
};

/** Headers for hunt/TI internal calls as a given cookie session. */
export const withHuntHeaders = (cookieHeader: Record<string, string>): Record<string, string> => ({
  ...TI_HEADERS,
  ...cookieHeader,
});
