/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiIdentificationStartTool } from './tool';
import { createMockToolContext, mockSourcesClient, sourceWithSlug } from '../../utils/test_helpers';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';

describe('createKiIdentificationStartTool', () => {
  const telemetry = {
    trackAgentToolKiIdentificationStarted: jest.fn(),
  };

  const setup = () => {
    const managementApi = {
      getWorkflow: jest.fn().mockResolvedValue({
        id: 'system-streams-ki-onboarding',
        name: 'onboarding',
        enabled: true,
        definition: {},
        yaml: '',
      }),
      runWorkflow: jest.fn().mockResolvedValue('execution-id-123'),
    };
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: managementApi as never,
      telemetry: { trackOnboardingScheduled: jest.fn() } as never,
    });
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue('enabled'),
    };

    const tool = createKiIdentificationStartTool({
      telemetry: telemetry as never,
      streamsKIsOnboardingClient,
      maintenanceService: maintenanceService as never,
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: mockSourcesClient(['logs.nginx']),
      }) as never,
    });
    const context = createMockToolContext();

    return { tool, context, managementApi, maintenanceService, streamsKIsOnboardingClient };
  };

  it('triggers onboarding workflow and returns immediately by default', async () => {
    const { tool, context, managementApi } = setup();

    const result = await tool.handler(
      {
        slug: 'logs.nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
      },
      context
    );

    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-streams-ki-onboarding' }),
      'default',
      expect.objectContaining({
        streamName: 'logs.nginx',
        skipFeatures: false,
        skipQueries: false,
      }),
      context.request
    );
    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        kibanaPath: '/app/significant_events/knowledge_indicators?source=logs.nginx',
        slug: 'logs.nginx',
        title: 'logs.nginx',
        view_name: '$.nightshift.sources.default.logs.nginx',
      });
    }
  });

  it('returns error result when workflow trigger fails', async () => {
    const { tool, context, managementApi } = setup();
    managementApi.runWorkflow.mockRejectedValueOnce(new Error('version conflict'));

    const result = await tool.handler(
      {
        slug: 'logs.nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to start KI identification background task');
      expect(data.operation).toBe('ki_identification_start');
    }
  });

  it('rejects a disabled source and does not start the workflow', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, context } = setup();
    const tool = createKiIdentificationStartTool({
      telemetry: telemetry as never,
      streamsKIsOnboardingClient,
      maintenanceService: maintenanceService as never,
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: jest.fn().mockResolvedValue({
            sources: [sourceWithSlug('nginx-errors', { enabled: false, id: 'source-nginx' })],
            total: 1,
          }),
        },
      }) as never,
    });

    const result = await tool.handler(
      { slug: 'nginx-errors', steps: [KIsOnboardingStep.FeaturesIdentification] },
      context
    );

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Source "nginx-errors" is disabled.');
      expect(data.slug).toBe('nginx-errors');
    }
  });

  it('returns an error for an unknown slug and does not start the workflow', async () => {
    const { tool, context, managementApi } = setup();

    const result = await tool.handler(
      { slug: 'missing', steps: [KIsOnboardingStep.FeaturesIdentification] },
      context
    );

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Source not found in this space: missing');
    }
  });
});
