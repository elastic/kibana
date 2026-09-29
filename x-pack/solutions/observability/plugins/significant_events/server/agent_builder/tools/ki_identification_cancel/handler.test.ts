/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { httpServerMock } from '@kbn/core/server/mocks';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';
import { cancelKiIdentificationToolHandler } from './handler';

describe('cancelKiIdentificationToolHandler', () => {
  it('cancels the latest workflow execution and returns cancel status', async () => {
    const managementApi = {
      getWorkflowExecutions: vi.fn().mockResolvedValue({
        results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }],
      }),
      cancelWorkflowExecution: vi.fn().mockResolvedValue(undefined),
    };
    const telemetry = { trackOnboardingScheduled: vi.fn() } as never;
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: { ...managementApi, getClient: vi.fn(() => managementApi) } as never,
      telemetry,
    });
    const request = httpServerMock.createKibanaRequest();

    const result = await cancelKiIdentificationToolHandler({
      streamName: 'logs.nginx',
      streamsKIsOnboardingClient,
      request,
    });

    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      request
    );
    expect(result).toEqual({
      stream_name: 'logs.nginx',
      execution_id: 'exec-1',
      status: SignificantEventsWorkflowStatus.Canceled,
    });
  });

  it('returns cancel status with null execution_id when no execution is found', async () => {
    const managementApi = {
      getWorkflowExecutions: vi.fn().mockResolvedValue({ results: [] }),
      cancelWorkflowExecution: vi.fn(),
    };
    const telemetry = { trackOnboardingScheduled: vi.fn() } as never;
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: { ...managementApi, getClient: vi.fn(() => managementApi) } as never,
      telemetry,
    });
    const request = httpServerMock.createKibanaRequest();

    const result = await cancelKiIdentificationToolHandler({
      streamName: 'logs.nginx',
      streamsKIsOnboardingClient,
      request,
    });

    expect(managementApi.cancelWorkflowExecution).not.toHaveBeenCalled();
    expect(result).toEqual({
      stream_name: 'logs.nginx',
      execution_id: null,
      status: SignificantEventsWorkflowStatus.Canceled,
    });
  });
});
