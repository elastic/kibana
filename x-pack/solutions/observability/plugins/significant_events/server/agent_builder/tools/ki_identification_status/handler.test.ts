/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';
import { getKiIdentificationStatusToolHandler } from './handler';

describe('getKiIdentificationStatusToolHandler', () => {
  it('returns the onboarding status', async () => {
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: {
        getClient: () => ({
          getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
          getWorkflowExecution: jest.fn().mockResolvedValue(null),
        }),
      } as never,
      telemetry: { trackOnboardingScheduled: jest.fn() } as never,
      getSourcesClient: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue({ source: { id: 'logs.nginx', slug: 'logs-nginx' } }),
      }),
    });

    const result = await getKiIdentificationStatusToolHandler({
      sourceId: 'logs.nginx',
      sourceSlug: 'logs-nginx',
      request: httpServerMock.createKibanaRequest(),
      streamsKIsOnboardingClient,
    });

    expect(result).toEqual({
      execution_id: null,
      status: SignificantEventsWorkflowStatus.NotStarted,
    });
  });
});
