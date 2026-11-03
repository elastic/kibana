/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';
import { createKiIdentificationCancelTool } from './tool';
import {
  createMockToolContext,
  createSignificantEventsServer,
  mockSourcesClient,
  type NightshiftFeaturePrivilege,
} from '../../utils/test_helpers';

describe('createKiIdentificationCancelTool', () => {
  const setup = ({
    featurePrivilege = 'all',
  }: { featurePrivilege?: NightshiftFeaturePrivilege } = {}) => {
    const managementApi = {
      getWorkflowExecutions: jest.fn().mockResolvedValue({
        results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }],
      }),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: { ...managementApi, getClient: jest.fn(() => managementApi) } as never,
      telemetry: { trackOnboardingScheduled: jest.fn() } as never,
      getSourcesClient: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue({ source: { id: 'logs.nginx', slug: 'logs-nginx' } }),
      }),
    });

    const tool = createKiIdentificationCancelTool({
      server: createSignificantEventsServer({ featurePrivilege }),
      streamsKIsOnboardingClient,
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: mockSourcesClient(['logs.nginx']),
      }) as never,
    });
    const context = createMockToolContext();
    return { tool, context, managementApi };
  };

  it('cancels workflow execution and returns canceled status', async () => {
    const { tool, context, managementApi } = setup();

    const result = await tool.handler({ slug: 'logs.nginx' }, context);

    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      context.request
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        slug: 'logs.nginx',
        title: 'logs.nginx',
        view_name: '$.nightshift.sources.default.logs.nginx',
        execution_id: 'exec-1',
        status: SignificantEventsWorkflowStatus.Canceled,
      });
    }
  });

  it('returns error result when cancellation fails', async () => {
    const { tool, context, managementApi } = setup();
    managementApi.cancelWorkflowExecution.mockRejectedValueOnce(new Error('boom'));

    const result = await tool.handler({ slug: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to cancel KI identification background task');
      expect(data.operation).toBe('ki_identification_cancel');
    }
  });

  it('does not let a Nightshift reader cancel onboarding', async () => {
    const { tool, context, managementApi } = setup({ featurePrivilege: 'read' });

    const result = await tool.handler({ slug: 'logs.nginx' }, context);

    expect(managementApi.cancelWorkflowExecution).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
