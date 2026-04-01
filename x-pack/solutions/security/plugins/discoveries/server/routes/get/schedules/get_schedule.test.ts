/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { getScheduleMock } from '../../../lib/schedules/__mocks__/schedules.mock';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerGetScheduleRoute } from './get_schedule';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api';

jest.mock('../../../lib/schedules/create_schedule_data_client');
jest.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api');

const mockGetSchedule = jest.fn();
const mockDataClient = { getSchedule: mockGetSchedule };

const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;

const getStartServices = jest.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: jest.fn() } },
});

describe('registerGetScheduleRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createScheduleDataClient as jest.Mock).mockResolvedValue(mockDataClient);
    (transformScheduleToApi as jest.Mock).mockReturnValue({ id: 's1', name: 'api-schedule' });
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the schedule on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const mockSchedule = getScheduleMock();
    mockGetSchedule.mockResolvedValue(mockSchedule);

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockGetSchedule).toHaveBeenCalledWith('s1');
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 's1', name: 'api-schedule' } });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a custom error when the schedule is not found', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetScheduleRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockGetSchedule.mockRejectedValue(new Error('Not found'));

    const request = httpServerMock.createKibanaRequest({ params: { id: 'missing' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error getting schedule missing: Not found');
  });
});
