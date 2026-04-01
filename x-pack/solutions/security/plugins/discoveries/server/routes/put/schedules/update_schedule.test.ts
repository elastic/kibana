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
import { registerUpdateScheduleRoute } from './update_schedule';

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

const mockAnalytics = coreMock.createSetup().analytics;
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import { transformUpdatePropsFromApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_update_props_from_api';
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api';

jest.mock('../../../lib/schedules/create_schedule_data_client');
jest.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_update_props_from_api');
jest.mock('@kbn/discoveries/impl/lib/schedules/transforms/transform_schedule_to_api');

const mockGetSchedule = jest.fn();
const mockUpdateSchedule = jest.fn();
const mockDataClient = { getSchedule: mockGetSchedule, updateSchedule: mockUpdateSchedule };

const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;

const getStartServices = jest.fn().mockResolvedValue({
  coreStart: {},
  pluginsStart: { actions: { getActionsClientWithRequest: jest.fn() } },
});

describe('registerUpdateScheduleRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createScheduleDataClient as jest.Mock).mockResolvedValue(mockDataClient);
    mockGetSchedule.mockResolvedValue(getScheduleMock());
    mockUpdateSchedule.mockResolvedValue(getScheduleMock());
    (transformUpdatePropsFromApi as jest.Mock).mockReturnValue({ name: 'internal-updated' });
    (transformScheduleToApi as jest.Mock).mockReturnValue({ name: 'api-updated' });
  });

  it('returns 404 when workflows feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { id: 's1' }, body: {} });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 200 with the updated schedule on success', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 's1' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockUpdateSchedule).toHaveBeenCalledWith({ id: 's1', name: 'internal-updated' });
    expect(response.ok).toHaveBeenCalledWith({ body: { name: 'api-updated' } });
  });

  it('calls getSchedule before calling transformUpdatePropsFromApi', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 's1' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    const getScheduleOrder = mockGetSchedule.mock.invocationCallOrder[0];
    const transformOrder = (transformUpdatePropsFromApi as jest.Mock).mock.invocationCallOrder[0];
    expect(getScheduleOrder).toBeLessThan(transformOrder);
  });

  it('passes existing workflowConfig to transform when the schedule has one', async () => {
    const existingWorkflowConfig = {
      alertRetrievalWorkflowIds: ['workflow-1'],
      defaultAlertRetrievalMode: 'custom_query' as const,
      validationWorkflowId: 'default',
    };

    mockGetSchedule.mockResolvedValue(
      getScheduleMock({ params: { workflowConfig: existingWorkflowConfig } as never })
    );

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 's1' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(transformUpdatePropsFromApi).toHaveBeenCalledWith(
      expect.anything(),
      existingWorkflowConfig
    );
  });

  it('passes undefined existingWorkflowConfig to transform for a pre-FF schedule', async () => {
    mockGetSchedule.mockResolvedValue(getScheduleMock());

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 's1' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(transformUpdatePropsFromApi).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('does NOT inject DEFAULT_WORKFLOW_CONFIG into a pre-FF schedule update', async () => {
    mockGetSchedule.mockResolvedValue(getScheduleMock());
    (transformUpdatePropsFromApi as jest.Mock).mockImplementation(
      (_body, existingWorkflowConfig) => ({
        name: 'internal-updated',
        workflowConfig: existingWorkflowConfig,
      })
    );

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 's1' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(mockUpdateSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ workflowConfig: undefined })
    );
  });

  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({ body: {}, params: { id: 's1' } });
    const response = httpServerMock.createResponseFactory();
    const context = { alerting: Promise.resolve({ getRulesClient: jest.fn() }) };

    const result = await handler(context, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns a custom error when the update fails', async () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerUpdateScheduleRoute(router, logger, { analytics: mockAnalytics, getStartServices });

    const handler = addVersionMock.mock.calls[0][1];
    mockUpdateSchedule.mockRejectedValue(new Error('update failed'));

    const request = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 's1' },
    });
    const response = httpServerMock.createResponseFactory();
    const context = {
      alerting: Promise.resolve({ getRulesClient: jest.fn() }),
      core: Promise.resolve({
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    };

    await handler(context, request, response);

    expect(response.customError).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error updating schedule s1: update failed');
  });
});
