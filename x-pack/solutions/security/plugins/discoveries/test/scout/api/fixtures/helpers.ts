/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';
import { COMMON_HEADERS, PUBLIC_SCHEDULE_ROUTES, SCHEDULE_ROUTES } from './constants';

/**
 * API client shape required by schedule test helpers.
 * Use this instead of importing Scout's ApiClient type directly.
 */
export interface ScheduleApiClient {
  delete(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
    }
  ): Promise<{ body: unknown; statusCode: number }>;
  get(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
    }
  ): Promise<{ body: unknown; statusCode: number }>;
  post(
    url: string,
    options: {
      body: unknown;
      headers: Record<string, string>;
      responseType: 'json';
    }
  ): Promise<{ body: unknown; statusCode: number }>;
  put(
    url: string,
    options: {
      body: unknown;
      headers: Record<string, string>;
      responseType: 'json';
    }
  ): Promise<{ body: unknown; statusCode: number }>;
}

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
    },
    size: 20,
  },
  schedule: {
    interval: '24h',
  },
  ...overrides,
});

/**
 * Convenience wrapper around the internal schedule API routes.
 * Encapsulates auth headers and route paths for cleaner test code.
 */
export const getWorkflowSchedulesApis = (
  apiClient: ScheduleApiClient,
  headers: Record<string, string>
) => {
  const defaultHeaders = { ...headers, ...COMMON_HEADERS };

  return {
    createSchedule: (body: Record<string, unknown>) =>
      apiClient.post(SCHEDULE_ROUTES.CREATE, {
        body,
        headers: defaultHeaders,
        responseType: 'json',
      }),

    deleteSchedule: (id: string) =>
      apiClient.delete(SCHEDULE_ROUTES.DELETE(id), {
        headers: defaultHeaders,
        responseType: 'json',
      }),

    disableSchedule: (id: string) =>
      apiClient.post(SCHEDULE_ROUTES.DISABLE(id), {
        body: {},
        headers: defaultHeaders,
        responseType: 'json',
      }),

    enableSchedule: (id: string) =>
      apiClient.post(SCHEDULE_ROUTES.ENABLE(id), {
        body: {},
        headers: defaultHeaders,
        responseType: 'json',
      }),

    findSchedules: (query: Record<string, unknown> = {}) =>
      apiClient.get(
        `${SCHEDULE_ROUTES.FIND}?${new URLSearchParams(
          query as Record<string, string>
        ).toString()}`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      ),

    getSchedule: (id: string) =>
      apiClient.get(SCHEDULE_ROUTES.GET(id), {
        headers: defaultHeaders,
        responseType: 'json',
      }),

    updateSchedule: (id: string, body: Record<string, unknown>) =>
      apiClient.put(SCHEDULE_ROUTES.UPDATE(id), {
        body,
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
  apiClient: ScheduleApiClient,
  headers: Record<string, string>
) => {
  const defaultHeaders = {
    ...headers,
    ...COMMON_HEADERS,
    'elastic-api-version': '2023-10-31',
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
  apiClient: ScheduleApiClient,
  headers: Record<string, string>
): Promise<void> => {
  const apis = getWorkflowSchedulesApis(apiClient, headers);
  const findResult = await apis.findSchedules({ per_page: '100' });
  const body = findResult.body as { data?: Array<{ id: string }> };
  const schedules = body.data ?? [];

  for (const schedule of schedules) {
    await apis.deleteSchedule(schedule.id);
  }
};

/**
 * Deletes all public attack discovery schedules created during test runs.
 */
export const deleteAllPublicSchedules = async (
  apiClient: ScheduleApiClient,
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
