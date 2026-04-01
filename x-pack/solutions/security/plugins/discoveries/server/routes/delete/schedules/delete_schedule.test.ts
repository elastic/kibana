/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerDeleteScheduleRoute } from './delete_schedule';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';

const mockAnalytics = coreMock.createSetup().analytics;

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../../lib/schedules/create_schedule_data_client');

const mockDeleteSchedule = jest.fn();
const mockDataClient = { deleteSchedule: mockDeleteSchedule };

const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;

const getStartServices = jest.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: jest.fn() } },
});

describe('registerDeleteScheduleRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createScheduleDataClient as jest.Mock).mockResolvedValue(mockDataClient);
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.delete as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerDeleteScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the deleted schedule id on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.delete as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerDeleteScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockDeleteSchedule.mockResolvedValue(undefined);

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockDeleteSchedule).toHaveBeenCalledWith({ id: 's1' });
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 's1' } });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.delete as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerDeleteScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a custom error when the delete fails', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.delete as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerDeleteScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockDeleteSchedule.mockRejectedValue(new Error('delete failed'));

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error deleting schedule s1: delete failed');
  });
});
