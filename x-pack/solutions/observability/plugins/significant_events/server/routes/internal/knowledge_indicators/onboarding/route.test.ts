/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { internalKIOnboardingRoutes } from './route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = internalKIOnboardingRoutes['POST /internal/streams/onboarding/_bulk_status'];

type HandlerParams = Parameters<typeof route.handler>[0];

describe('onboardingBulkStatusRoute', () => {
  it('returns not_started for ids outside the space catalog', async () => {
    const getStatuses = jest.fn().mockResolvedValue({
      'source-a': {
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'exec-1',
      },
    });
    const handlerParams = {
      params: { body: { streamNames: ['source-a', 'other-space-source'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          list: jest.fn().mockResolvedValue({
            sources: [
              { id: 'source-a', slug: 'slug-a' },
              { id: 'source-b', slug: 'slug-b' },
            ],
            total: 2,
            page: 1,
            per_page: 10_000,
          }),
        },
      }),
      server: {},
      workflowClients: {
        streamsKIsOnboardingClient: { getStatuses },
      },
    } as unknown as HandlerParams;

    const result = await route.handler(handlerParams);

    expect(getStatuses).toHaveBeenCalledWith({
      sources: [{ id: 'source-a', slug: 'slug-a' }],
      request: handlerParams.request,
    });
    expect(result).toEqual({
      'source-a': {
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'exec-1',
      },
      'other-space-source': {
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      },
    });
    expect(assertSignificantEventsAccess).toHaveBeenCalled();
  });
});

describe('onboardingExecuteRoute', () => {
  const executeRoute =
    internalKIOnboardingRoutes['POST /internal/streams/{streamName}/onboarding/_execute'];

  it('rejects scheduling a disabled source', async () => {
    const run = jest.fn();
    const handlerParams = {
      params: {
        path: { streamName: 'source-a' },
        body: { action: 'schedule', from: Date.now(), to: Date.now(), steps: [] },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          get: jest.fn().mockResolvedValue({
            source: { id: 'source-a', enabled: false },
          }),
        },
      }),
      server: {},
      workflowClients: {
        streamsKIsOnboardingClient: { run },
      },
      maintenanceService: { getState: jest.fn() },
    } as unknown as Parameters<typeof executeRoute.handler>[0];

    const error = await executeRoute.handler(handlerParams).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      message: 'Cannot schedule onboarding for a disabled source',
      output: { statusCode: 400 },
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('schedules a run keyed by the source slug', async () => {
    const run = jest.fn().mockResolvedValue({ executionId: 'exec-1' });
    const handlerParams = {
      params: {
        path: { streamName: 'source-a' },
        body: { action: 'schedule', from: 1, to: 2, steps: [] },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          get: jest.fn().mockResolvedValue({
            source: { id: 'source-a', slug: 'slug-a', enabled: true },
          }),
        },
      }),
      server: {},
      workflowClients: {
        streamsKIsOnboardingClient: { run },
      },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    } as unknown as Parameters<typeof executeRoute.handler>[0];

    const result = await executeRoute.handler(handlerParams);

    expect(run).toHaveBeenCalledWith({
      inputs: expect.objectContaining({ streamName: 'source-a', sourceSlug: 'slug-a' }),
      request: handlerParams.request,
    });
    expect(result).toEqual({
      status: SignificantEventsWorkflowStatus.InProgress,
      executionId: 'exec-1',
    });
  });

  it('cancels and reads the status by source slug', async () => {
    const cancel = jest.fn().mockResolvedValue('exec-1');
    const getStatus = jest.fn().mockResolvedValue({
      status: SignificantEventsWorkflowStatus.Canceled,
      executionId: 'exec-1',
    });
    const handlerParams = {
      params: {
        path: { streamName: 'source-a' },
        body: { action: 'cancel' },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        sourcesClient: {
          get: jest.fn().mockResolvedValue({
            source: { id: 'source-a', slug: 'slug-a', enabled: true },
          }),
        },
      }),
      server: {},
      workflowClients: {
        streamsKIsOnboardingClient: { cancel, getStatus },
      },
      maintenanceService: { getState: jest.fn() },
    } as unknown as Parameters<typeof executeRoute.handler>[0];

    await executeRoute.handler(handlerParams);

    expect(cancel).toHaveBeenCalledWith({
      streamName: 'source-a',
      sourceSlug: 'slug-a',
      request: handlerParams.request,
    });
    expect(getStatus).toHaveBeenCalledWith({
      streamName: 'source-a',
      sourceSlug: 'slug-a',
      request: handlerParams.request,
    });
  });
});
