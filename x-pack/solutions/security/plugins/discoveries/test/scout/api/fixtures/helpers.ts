/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type { ApiClientFixture, KbnClient, KibanaRole } from '@kbn/scout-security';
import type { DiscoveriesApi } from '@kbn/security-solution-test-api-clients/scout';
import type { CreateAttackDiscoveryScheduleRequestBodyInput } from '@kbn/discoveries-schemas/schemas/routes/post/schedules/create_schedule_route.gen';
import type { FindAttackDiscoverySchedulesRequestQueryInput } from '@kbn/discoveries-schemas/schemas/routes/get/schedules/find_schedules_route.gen';
import type { PostGenerateRequestBodyInput } from '@kbn/discoveries-schemas/schemas/routes/post/generate/post_generate.gen';
import type { UpdateAttackDiscoveryScheduleRequestBodyInput } from '@kbn/discoveries-schemas/schemas/routes/put/schedules/update_schedule_route.gen';
import {
  ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
  COMMON_HEADERS,
  ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING,
  MONITORING_ROUTES,
  PUBLIC_SCHEDULE_ROUTES,
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
 * Enables the AD 2.0 workflows surface so the internal API routes (`_generate`, schedules,
 * monitoring) become reachable. The routes are gated twice (see `isWorkflowsEnabledForSpace`): the
 * global `securitySolution.attackDiscoveryWorkflowsEnabled` feature flag AND the per-space
 * `securitySolution:enableAttackDiscoveryWorkflows` Advanced Setting, which defaults to `false`.
 * Without both, the routes fall through to `404 Not Found` via `assertWorkflowsEnabled`.
 *
 * Call this in `beforeAll` before exercising any internal route.
 */
export const enableWorkflowsFeatureFlag = async ({
  apiServices,
  kbnClient,
}: {
  apiServices: CoreApiSettingsFixture;
  kbnClient: KbnClient;
}): Promise<void> => {
  await apiServices.core.settings({
    'feature_flags.overrides': {
      [ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG]: true,
    },
  });
  await kbnClient.uiSettings.update({ [ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING]: true });
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
 * Returns a minimal valid workflow schedule body for creating a schedule
 * via the internal API. Matches the AttackDiscoveryScheduleCreateProps schema.
 */
export const getSimpleWorkflowSchedule = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  actions: [],
  enabled: false,
  name: 'Test workflow schedule',
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
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
 * Returns a minimal valid schedule body for the public API.
 * The public API uses camelCase inside api_config and has no workflow_config.
 */
export const getSimplePublicSchedule = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  actions: [],
  enabled: false,
  name: 'Test public schedule',
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      actionTypeId: '.gen-ai',
      connectorId: 'test-connector-id',
      name: 'Test connector',
    },
    size: 20,
  },
  schedule: {
    interval: '24h',
  },
  ...overrides,
});

/**
 * Convenience wrapper around the internal schedule API routes, backed by the generated
 * `discoveriesApi` Scout client. Encapsulates auth headers for cleaner test code. Bodies stay loosely
 * typed on purpose so negative tests can send invalid payloads.
 */
export const getWorkflowSchedulesApis = (
  discoveriesApi: DiscoveriesApi,
  headers: Record<string, string>
) => {
  const options = { headers: { ...headers, ...COMMON_HEADERS } };

  return {
    createSchedule: (body: Record<string, unknown>) =>
      discoveriesApi.createAttackDiscoverySchedule(
        { body: body as CreateAttackDiscoveryScheduleRequestBodyInput },
        options
      ),

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
 * route. Matches the PostGenerateRequestBody schema (required: alerts index
 * pattern + api_config).
 */
export const getSimpleGenerateBody = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  alerts_index_pattern: '.alerts-security.alerts-default',
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
export const getGenerateApi = (discoveriesApi: DiscoveriesApi, headers: Record<string, string>) => {
  const options = { headers: { ...headers, ...COMMON_HEADERS } };

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
export const getMonitoringApis = (apiClient: ApiClientFixture, headers: Record<string, string>) => {
  const defaultHeaders = { ...headers, ...COMMON_HEADERS, ...INTERNAL_API_HEADERS };

  return {
    getExecutionTracking: (executionId: string) =>
      apiClient.get(MONITORING_ROUTES.EXECUTION_TRACKING(executionId), {
        headers: defaultHeaders,
        responseType: 'json',
      }),

    getPipelineData: (workflowId: string, executionId: string) =>
      apiClient.get(MONITORING_ROUTES.PIPELINE_DATA(workflowId, executionId), {
        headers: defaultHeaders,
        responseType: 'json',
      }),
  };
};

/**
 * Convenience wrapper around the public attack discovery schedule API routes.
 * Used by isolation tests to create/find schedules via the public API.
 */
export const getPublicSchedulesApis = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
) => {
  const defaultHeaders = {
    ...headers,
    ...COMMON_HEADERS,
    ...PUBLIC_API_HEADERS,
  };

  return {
    createSchedule: (body: Record<string, unknown>) =>
      apiClient.post(PUBLIC_SCHEDULE_ROUTES.CREATE, {
        body,
        headers: defaultHeaders,
        responseType: 'json',
      }),

    deleteSchedule: (id: string) =>
      apiClient.delete(PUBLIC_SCHEDULE_ROUTES.DELETE(id), {
        headers: defaultHeaders,
        responseType: 'json',
      }),

    findSchedules: (query: Record<string, unknown> = {}) =>
      apiClient.get(
        `${PUBLIC_SCHEDULE_ROUTES.FIND}?${new URLSearchParams(
          query as Record<string, string>
        ).toString()}`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      ),

    getSchedule: (id: string) =>
      apiClient.get(PUBLIC_SCHEDULE_ROUTES.GET(id), {
        headers: defaultHeaders,
        responseType: 'json',
      }),
  };
};

/**
 * Enables the workflow schedules feature flag via kibana advanced settings.
 * Call this in beforeAll to ensure the internal schedule API is available.
 */
export const enableWorkflowSchedulesFeature = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.uiSettings.update({
    'securitySolution:securityAttackDiscoverySchedulesEnabled': true,
  });
};

/**
 * Deletes all workflow schedules created during test runs.
 * Call this in afterAll/afterEach for test isolation.
 */
export const deleteAllWorkflowSchedules = async (
  discoveriesApi: DiscoveriesApi,
  headers: Record<string, string>
): Promise<void> => {
  const apis = getWorkflowSchedulesApis(discoveriesApi, headers);
  const findResult = await apis.findSchedules({ per_page: 100 });
  const schedules = findResult.body.data ?? [];

  for (const schedule of schedules) {
    await apis.deleteSchedule(schedule.id);
  }
};

/**
 * Deletes all public attack discovery schedules created during test runs.
 */
export const deleteAllPublicSchedules = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<void> => {
  const apis = getPublicSchedulesApis(apiClient, headers);
  const findResult = await apis.findSchedules({ per_page: '100' });
  const body = findResult.body as { data?: Array<{ id: string }> };
  const schedules = body.data ?? [];

  for (const schedule of schedules) {
    await apis.deleteSchedule(schedule.id);
  }
};
