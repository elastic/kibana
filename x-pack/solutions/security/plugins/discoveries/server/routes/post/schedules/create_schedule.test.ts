/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { getScheduleMock } from '../../../lib/schedules/__mocks__/schedules.mock';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { registerCreateScheduleRoute } from './create_schedule';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

const mockAnalytics = coreMock.createSetup().analytics;
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import { transformCreatePropsFromApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_create_props_from_api';
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api';

jest.mock('../../../lib/schedules/create_schedule_data_client');
jest.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_create_props_from_api');
jest.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api');

const mockCreateSchedule = jest.fn();
const mockDataClient = { createSchedule: mockCreateSchedule };

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as Logger;

const getStartServices = jest.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: jest.fn() } },
});

describe('registerCreateScheduleRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createScheduleDataClient as jest.Mock).mockResolvedValue(mockDataClient);
    (transformCreatePropsFromApi as jest.Mock).mockReturnValue({ name: 'internal' });
    (transformScheduleToApi as jest.Mock).mockReturnValue({ name: 'api-response' });
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ body: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the created schedule on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const mockSchedule = getScheduleMock();
    mockCreateSchedule.mockResolvedValue(mockSchedule);

    const request = httpServerMock.createKibanaRequest({
      body: {
        name: 'Test',
        params: {
          alerts_index_pattern: '.alerts-*',
          api_config: { connector_id: 'c1', action_type_id: '.gen-ai' },
          size: 100,
        },
        schedule: { interval: '10m' },
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
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
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ body: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a custom error when the data client throws', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerCreateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockCreateSchedule.mockRejectedValue(new Error('boom'));

    const request = httpServerMock.createKibanaRequest({ body: {} });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error creating schedule: boom');
  });
});
