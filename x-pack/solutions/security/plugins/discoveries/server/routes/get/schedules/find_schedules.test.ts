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
import { registerFindSchedulesRoute } from './find_schedules';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api';

jest.mock('../../../lib/schedules/create_schedule_data_client');
jest.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api');

const mockFindSchedules = jest.fn();
const mockDataClient = { findSchedules: mockFindSchedules };

const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;

const getStartServices = jest.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: jest.fn() } },
});

describe('registerFindSchedulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createScheduleDataClient as jest.Mock).mockResolvedValue(mockDataClient);
    (transformScheduleToApi as jest.Mock).mockImplementation((s) => ({ ...s, transformed: true }));
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerFindSchedulesRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ query: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with paginated results on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerFindSchedulesRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const mockSchedule = getScheduleMock();
    mockFindSchedules.mockResolvedValue({ data: [mockSchedule], total: 1 });

    const request = httpServerMock.createKibanaRequest({
      query: { page: 1, per_page: 10, sort_field: 'name', sort_direction: 'asc' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockFindSchedules).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      sort: { sortDirection: 'asc', sortField: 'name' },
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        data: [expect.objectContaining({ transformed: true })],
        page: 1,
        per_page: 10,
        total: 1,
      },
    });
  });

  it('uses defaults when page and per_page are not provided', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerFindSchedulesRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockFindSchedules.mockResolvedValue({ data: [], total: 0 });

    const request = httpServerMock.createKibanaRequest({ query: {} });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { data: [], page: 1, per_page: 10, total: 0 },
    });
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerFindSchedulesRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ query: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a custom error when the data client throws', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerFindSchedulesRoute(router, logger, { getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockFindSchedules.mockRejectedValue(new Error('find failed'));

    const request = httpServerMock.createKibanaRequest({ query: {} });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error finding schedules: find failed');
  });
});
