/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { Logger } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { getScheduleMock } from '../../../lib/schedules/__mocks__/schedules.mock';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerGetScheduleRoute } from './get_schedule';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';

vi.mock('../../../lib/assert_workflows_enabled', () => {
  const mocked = {
    assertWorkflowsEnabled: vi.fn().mockResolvedValue(null),
  };
  return { ...mocked, default: mocked };
});
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api';

vi.mock('../../../lib/schedules/create_schedule_data_client');
vi.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api');

const mockGetSchedule = vi.fn();
const mockDataClient = { getSchedule: mockGetSchedule };

const logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as Logger;

const getStartServices = vi.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: vi.fn() } },
});

describe('registerGetScheduleRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createScheduleDataClient as Mock).mockResolvedValue(mockDataClient);
    (transformScheduleToApi as Mock).mockReturnValue({ id: 's1', name: 'api-schedule' });
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.get as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: vi.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the schedule on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.get as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const mockSchedule = getScheduleMock();
    mockGetSchedule.mockResolvedValue(mockSchedule);

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockGetSchedule).toHaveBeenCalledWith('s1');
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 's1', name: 'api-schedule' } });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.get as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

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
    (router.versioned.get as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['securitySolution-attackDiscoveryAll']),
          }),
        }),
      })
    );
  });

  it('registers the route with ALERTS_API_READ in requiredPrivileges', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.get as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          authz: expect.objectContaining({
            requiredPrivileges: expect.arrayContaining(['alerts-read']),
          }),
        }),
      })
    );
  });

  it('returns a custom error when the schedule is not found', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = vi.fn();
    (router.versioned.get as Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockGetSchedule.mockRejectedValue(new Error('Not found'));

    const request = httpServerMock.createKibanaRequest({ params: { id: 'missing' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: vi.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: vi.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error getting schedule missing: Not found');
  });
});
