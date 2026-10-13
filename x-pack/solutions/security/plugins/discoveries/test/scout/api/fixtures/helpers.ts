/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import type { ApiClientFixture, KibanaRole } from '@kbn/scout-security';
import type { DiscoveriesApi } from '@kbn/security-solution-test-api-clients/scout';
import type { CreateAttackDiscoveryScheduleRequestBodyInput } from '@kbn/discoveries-schemas/schemas/routes/post/schedules/create_schedule_route.gen';
import type { FindAttackDiscoverySchedulesRequestQueryInput } from '@kbn/discoveries-schemas/schemas/routes/get/schedules/find_schedules_route.gen';
import type { PostGenerateRequestBodyInput } from '@kbn/discoveries-schemas/schemas/routes/post/generate/post_generate.gen';
import type { UpdateAttackDiscoveryScheduleRequestBodyInput } from '@kbn/discoveries-schemas/schemas/routes/put/schedules/update_schedule_route.gen';
import {
  ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
  COMMON_HEADERS,
  MONITORING_ROUTES,
} from './constants';

/**
 * Minimal shape of the Scout `apiServices` fixture required to override runtime
 * feature flags via the core `_settings` endpoint.
 */
export interface CoreApiSettingsFixture {
  core: {
    settings: (configOverrides: Record<string, unknown>) => Promise<void>;
  };
}

/**
 * Enables the process-wide `securitySolution.attackDiscoveryWorkflowsEnabled` feature flag so the
 * AD 2.0 internal API routes (`_generate`, schedules, monitoring) become reachable. The routes are
 * gated twice (see `isWorkflowsEnabledForSpace`): this flag AND the per-space
 * `securitySolution:enableAttackDiscoveryWorkflows` Advanced Setting, which the `scheduleSpace`
 * fixture enables in the worker's own space. Without both, the routes fall through to
 * `404 Not Found` via `assertWorkflowsEnabled`.
 *
 * Called once from `global.setup.ts`.
 */
export const enableWorkflowsFeatureFlag = async ({
  apiServices,
}: {
  apiServices: CoreApiSettingsFixture;
}): Promise<void> => {
  await apiServices.core.settings({
    'feature_flags.overrides': {
      [ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG]: true,
    },
  });
};

/**
 * Reverts `enableWorkflowsFeatureFlag`. The override is process-wide, so it outlives any single spec
 * and would leak into other suites sharing the Kibana instance. Called once from
 * `global.teardown.ts`, after every spec file has finished.
 */
export const disableWorkflowsFeatureFlag = async ({
  apiServices,
}: {
  apiServices: CoreApiSettingsFixture;
}): Promise<void> => {
  // `null` removes the key from the dynamic config overrides instead of pinning it to `false`
  await apiServices.core.settings({
    'feature_flags.overrides': {
      [ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG]: null,
    },
  });
};

/**
 * Least-privilege role for exercising the internal schedule CRUD routes
 * (create / get / find / update / delete / enable / disable).
 *
 * Using this scoped role instead of `admin` documents the minimum privileges
 * the routes actually need and surfaces accidental privilege drift that a
 * cluster-admin would silently satisfy. The privileges map to the route
 * `requiredPrivileges`:
 * - `securitySolutionAttackDiscovery: ['all']` grants both
 *   `securitySolution-attackDiscoveryAll` and the write action
 *   `securitySolution-updateAttackDiscoverySchedule` (the `update_schedule`
 *   sub-feature privilege is `includeIn: 'all'`).
 * - `securitySolutionAlertsV1: ['read']` grants `alerts-read`.
 * - `workflowsManagement: ['all']` grants `workflowsManagement:read` +
 *   `workflowsManagement:execute`.
 */
export const getScheduleAdminRoleDescriptor = (): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        securitySolutionAlertsV1: ['read'],
        securitySolutionAttackDiscovery: ['all'],
        workflowsManagement: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Returns the space-specific security alerts index the create, update and generate routes require
 * in `alerts_index_pattern` (see the server's `assertAlertsIndexPatternInSpace`).
 */
export const getAlertsIndexPatternForSpace = (spaceId: string): string =>
  `.alerts-security.alerts-${spaceId}`;

/**
 * Returns a minimal valid workflow schedule body for creating a schedule in the given space
 * via the internal API. Matches the AttackDiscoveryScheduleCreateProps schema.
 */
export const getSimpleWorkflowSchedule = (
  spaceId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  actions: [],
  enabled: false,
  name: 'Test workflow schedule',
  params: {
    alerts_index_pattern: getAlertsIndexPatternForSpace(spaceId),
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
    },
    size: 20,
    workflow_config: {
      alert_retrieval_mode: 'custom_query',
      alert_retrieval_workflow_ids: [],
    },
  },
  schedule: {
    interval: '24h',
  },
  ...overrides,
});

/**
 * Convenience wrapper around the internal schedule API routes, backed by the generated
 * `discoveriesApi` Scout client. Encapsulates auth headers and the target space for cleaner test
 * code. Bodies stay loosely typed on purpose so negative tests can send invalid payloads.
 *
 * Every successfully created schedule id is recorded per space so `deleteAllWorkflowSchedules`
 * can remove it directly instead of relying on the eventually-consistent find route.
 */
export const getWorkflowSchedulesApis = (
  discoveriesApi: DiscoveriesApi,
  headers: Record<string, string>,
  spaceId: string
) => {
  const options = { headers: { ...headers, ...COMMON_HEADERS }, kibanaSpace: spaceId };
  const createdScheduleIds = getCreatedScheduleIds(spaceId);

  return {
    createSchedule: async (body: Record<string, unknown>) => {
      const response = await discoveriesApi.createAttackDiscoverySchedule(
        { body: body as CreateAttackDiscoveryScheduleRequestBodyInput },
        options
      );

      if (response.statusCode === 200) {
        createdScheduleIds.add(response.body.id);
      }

      return response;
    },

    deleteSchedule: (id: string) =>
      discoveriesApi.deleteAttackDiscoverySchedule({ params: { id } }, options),

    disableSchedule: (id: string) =>
      discoveriesApi.disableAttackDiscoverySchedule({ params: { id } }, options),

    enableSchedule: (id: string) =>
      discoveriesApi.enableAttackDiscoverySchedule({ params: { id } }, options),

    findSchedules: (query: Record<string, unknown> = {}) =>
      discoveriesApi.findAttackDiscoverySchedules(
        { query: query as FindAttackDiscoverySchedulesRequestQueryInput },
        options
      ),

    getSchedule: (id: string) =>
      discoveriesApi.getAttackDiscoverySchedule({ params: { id } }, options),

    updateSchedule: (id: string, body: Record<string, unknown>) =>
      discoveriesApi.updateAttackDiscoverySchedule(
        { params: { id }, body: body as UpdateAttackDiscoveryScheduleRequestBodyInput },
        options
      ),
  };
};

/**
 * Returns a minimal valid ad-hoc generation body for the internal `_generate`
 * route in the given space. Matches the PostGenerateRequestBody schema (required: alerts index
 * pattern + api_config).
 */
export const getSimpleGenerateBody = (
  spaceId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  alerts_index_pattern: getAlertsIndexPatternForSpace(spaceId),
  api_config: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
  },
  size: 20,
  ...overrides,
});

/**
 * Convenience wrapper around the internal ad-hoc generation route, backed by the generated
 * `discoveriesApi` Scout client.
 */
export const getGenerateApi = (
  discoveriesApi: DiscoveriesApi,
  headers: Record<string, string>,
  spaceId: string
) => {
  const options = { headers: { ...headers, ...COMMON_HEADERS }, kibanaSpace: spaceId };

  return {
    generate: (body: Record<string, unknown>) =>
      discoveriesApi.postGenerate({ body: body as PostGenerateRequestBodyInput }, options),
  };
};

/**
 * Convenience wrapper around the internal execution-monitoring routes.
 *
 * These routes require attack discovery + alerts read + workflows READ (not
 * execute), so a workflows-read caller can monitor executions without being
 * able to trigger them.
 */
export const getMonitoringApis = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  spaceId: string
) => {
  const defaultHeaders = { ...headers, ...COMMON_HEADERS, ...INTERNAL_API_HEADERS };

  return {
    getExecutionTracking: (executionId: string) =>
      apiClient.get(`s/${spaceId}/${MONITORING_ROUTES.EXECUTION_TRACKING(executionId)}`, {
        headers: defaultHeaders,
        responseType: 'json',
      }),

    getPipelineData: (workflowId: string, executionId: string) =>
      apiClient.get(`s/${spaceId}/${MONITORING_ROUTES.PIPELINE_DATA(workflowId, executionId)}`, {
        headers: defaultHeaders,
        responseType: 'json',
      }),
  };
};

/**
 * Deletes every workflow schedule in the given space. Only ever pointed at the worker's own
 * `scheduleSpace`, so it cannot touch schedules owned by other suites. Call this in `afterEach`.
 *
 * Schedules created through `getWorkflowSchedulesApis` are deleted by their recorded ids first, so
 * a schedule that is not yet searchable is still removed. The find sweep afterwards only catches
 * schedules created outside the wrapper.
 */
export const deleteAllWorkflowSchedules = async (
  discoveriesApi: DiscoveriesApi,
  headers: Record<string, string>,
  spaceId: string
): Promise<void> => {
  const apis = getWorkflowSchedulesApis(discoveriesApi, headers, spaceId);
  const createdScheduleIds = getCreatedScheduleIds(spaceId);

  for (const id of createdScheduleIds) {
    // 404 means the schedule is already gone, which is the state we want
    assertCleanupStatus(`delete ${id}`, await apis.deleteSchedule(id), [200, 404]);
  }

  createdScheduleIds.clear();

  const findResult = await apis.findSchedules({ per_page: 100 });
  assertCleanupStatus('find', findResult, [200]);

  for (const schedule of findResult.body.data ?? []) {
    assertCleanupStatus(
      `delete ${schedule.id}`,
      await apis.deleteSchedule(schedule.id),
      [200, 404]
    );
  }
};

/**
 * Fails cleanup loudly instead of letting a 4xx/5xx leave stale schedules behind that would break
 * the count assertions of unrelated specs sharing the worker's space.
 */
const assertCleanupStatus = (
  operation: string,
  response: { statusCode: number; body: unknown },
  allowedStatusCodes: number[]
): void => {
  if (allowedStatusCodes.includes(response.statusCode)) {
    return;
  }

  throw new Error(
    `Schedule cleanup failed on ${operation}: HTTP ${response.statusCode} ${JSON.stringify(
      response.body
    )}`
  );
};

const createdScheduleIdsBySpace = new Map<string, Set<string>>();

const getCreatedScheduleIds = (spaceId: string): Set<string> => {
  const existing = createdScheduleIdsBySpace.get(spaceId);

  if (existing) {
    return existing;
  }

  const created = new Set<string>();
  createdScheduleIdsBySpace.set(spaceId, created);

  return created;
};
