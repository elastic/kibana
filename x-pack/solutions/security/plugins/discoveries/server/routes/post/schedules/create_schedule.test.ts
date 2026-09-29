/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { Logger } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { getScheduleMock } from '../../../lib/schedules/__mocks__/schedules.mock';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerCreateScheduleRoute } from './create_schedule';

vi.mock('../../../lib/assert_workflows_enabled', () => {
  const mocked = {
    assertWorkflowsEnabled: vi.fn().mockResolvedValue(null),
  };
  return { ...mocked, default: mocked };
});

const mockAnalytics = coreMock.createSetup().analytics;
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import { transformCreatePropsFromApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_create_props_from_api';
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api';

vi.mock('../../../lib/schedules/create_schedule_data_client');
vi.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_create_props_from_api');
vi.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api');

const mockCreateSchedule = vi.fn();
const mockDataClient = { createSchedule: mockCreateSchedule };

const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
} as unknown as Logger;

const getStartServices = vi.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: vi.fn() } },
});

describe('registerCreateScheduleRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createScheduleDataClient as Mock).mockResolvedValue(mockDataClient);
    (transformCreatePropsFromApi as Mock).mockReturnValue({ name: 'internal' });
    (transformScheduleToApi as Mock).mockReturnValue({ name: 'api-response' });
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ body: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: vi.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the created schedule on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const mockSchedule = getScheduleMock();
    mockCreateSchedule.mockResolvedValue(mockSchedule);

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'Test',
        params: {
          alerts_index_pattern: '.alerts-security.alerts-default',
          api_config: { connector_id: 'c1', action_type_id: '.gen-ai' },
          size: 100,
        },
        schedule: { interval: '10m' },
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(createScheduleDataClient).toHaveBeenCalled();
    expect(transformCreatePropsFromApi).toHaveBeenCalled();
    expect(mockCreateSchedule).toHaveBeenCalledWith({ name: 'internal' });
    expect(transformScheduleToApi).toHaveBeenCalledWith(mockSchedule);
    expect(response.ok).toHaveBeenCalledWith({ body: { name: 'api-response' } });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ body: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: vi.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a 400 error when the alerts index targets another space', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'Test',
        params: {
          alerts_index_pattern: '.alerts-security.alerts-other-space',
          api_config: { connector_id: 'c1', action_type_id: '.gen-ai' },
          size: 100,
        },
        schedule: { interval: '10m' },
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('does not create a schedule when the alerts index targets another space', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'Test',
        params: {
          alerts_index_pattern: '.alerts-security.alerts-*',
          api_config: { connector_id: 'c1', action_type_id: '.gen-ai' },
          size: 100,
        },
        schedule: { interval: '10m' },
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockCreateSchedule).not.toHaveBeenCalled();
  });

  it('registers the route with ATTACK_DISCOVERY_API_ACTION_ALL in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['securitySolution-attackDiscoveryAll']),
          }),
        }),
      })
    );
  });

  it('registers the route with ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining([
              'securitySolution-updateAttackDiscoverySchedule',
            ]),
          }),
        }),
      })
    );
  });

  it('registers the route with ALERTS_API_READ in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['alerts-read']),
          }),
        }),
      })
    );
  });

  it('registers the route with the workflows read + execute privileges in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining([
              'workflowsManagement:read',
              'workflowsManagement:execute',
            ]),
          }),
        }),
      })
    );
  });

  it('returns a custom error when the data client throws', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockCreateSchedule.mockRejectedValue(new Error('boom'));

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'Test',
        params: {
          alerts_index_pattern: '.alerts-security.alerts-default',
          api_config: { connector_id: 'c1', action_type_id: '.gen-ai' },
          size: 100,
        },
        schedule: { interval: '10m' },
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error creating schedule: boom');
  });
});
