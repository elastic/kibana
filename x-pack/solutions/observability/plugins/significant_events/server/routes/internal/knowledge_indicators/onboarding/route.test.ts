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
            sources: [{ id: 'source-a' }],
            total: 1,
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

    expect(getStatuses).toHaveBeenCalledWith({ streamNames: ['source-a'] });
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
