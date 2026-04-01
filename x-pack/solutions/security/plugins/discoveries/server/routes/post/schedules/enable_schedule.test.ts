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
import { registerEnableScheduleRoute } from './enable_schedule';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

const mockAnalytics = coreMock.createSetup().analytics;
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';

jest.mock('../../../lib/schedules/create_schedule_data_client');

const mockEnableSchedule = jest.fn();
const mockDataClient = { enableSchedule: mockEnableSchedule };

const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;

const getStartServices = jest.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: jest.fn() } },
});

describe('registerEnableScheduleRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createScheduleDataClient as jest.Mock).mockResolvedValue(mockDataClient);
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the enabled schedule id on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockEnableSchedule.mockResolvedValue(undefined);

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockEnableSchedule).toHaveBeenCalledWith({ id: 's1' });
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 's1' } });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a custom error when the enable fails', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerEnableScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockEnableSchedule.mockRejectedValue(new Error('enable failed'));

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
    expect(logger.error).toHaveBeenCalledWith('Error enabling schedule s1: enable failed');
  });
});
