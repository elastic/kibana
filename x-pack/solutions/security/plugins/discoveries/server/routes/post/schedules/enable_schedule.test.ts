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
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerEnableScheduleRoute } from './enable_schedule';

vi.mock('../../../lib/assert_workflows_enabled', () => {
      const mocked = {
      assertWorkflowsEnabled: vi.fn().mockResolvedValue(null),
    };
      return { ...mocked, default: mocked };
    });

const mockAnalytics = coreMock.createSetup().analytics;
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';

vi.mock('../../../lib/schedules/create_schedule_data_client');

const mockEnableSchedule = vi.fn();
const mockDataClient = { enableSchedule: mockEnableSchedule };

const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as Logger;

const getStartServices = vi.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: vi.fn() } },
});

describe('registerEnableScheduleRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createScheduleDataClient as Mock).mockResolvedValue(mockDataClient);
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: vi.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the enabled schedule id on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockEnableSchedule.mockResolvedValue(undefined);

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockEnableSchedule).toHaveBeenCalledWith({ id: 's1' });
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 's1' } });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: vi.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('registers the route with ATTACK_DISCOVERY_API_ACTION_ALL in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

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

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

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

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

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

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

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

  it('returns a custom error when the enable fails', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.post as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockEnableSchedule.mockRejectedValue(new Error('enable failed'));

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error enabling schedule s1: enable failed');
  });
});
