/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiIdentificationStartTool } from './tool';
import {
  createMockToolContext,
  createSignificantEventsServer,
  mockSourcesClient,
  type NightshiftFeaturePrivilege,
} from '../../utils/test_helpers';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';

describe('createKiIdentificationStartTool', () => {
  const telemetry = {
    trackAgentToolKiIdentificationStarted: jest.fn(),
  };

  const setup = ({
    featurePrivilege = 'all',
  }: { featurePrivilege?: NightshiftFeaturePrivilege } = {}) => {
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
    // `run()` resolves the slug and query revision from the catalog itself, so it needs `get`.
    const sourcesGet = jest.fn().mockResolvedValue({
      source: { slug: 'logs.nginx', esql_updated_at: '2026-01-01T00:00:00.000Z' },
    });
    const getSourcesClient = jest.fn().mockResolvedValue({ get: sourcesGet });
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: { ...managementApi, getClient: jest.fn(() => managementApi) } as never,
      telemetry: { trackOnboardingScheduled: jest.fn() } as never,
      getSourcesClient,
    });
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue('enabled'),
    };

    const tool = createKiIdentificationStartTool({
      server: createSignificantEventsServer({ featurePrivilege }),
      telemetry: telemetry as never,
      streamsKIsOnboardingClient,
      maintenanceService: maintenanceService as never,
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: mockSourcesClient(['logs.nginx']),
      }) as never,
    });
    const context = createMockToolContext();

    return {
      tool,
      context,
      managementApi,
      maintenanceService,
      streamsKIsOnboardingClient,
      sourcesGet,
    };
  };

  it('triggers onboarding workflow and returns immediately by default', async () => {
    const { tool, context, managementApi, sourcesGet } = setup();

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
        sourceId: 'logs.nginx',
        sourceSlug: 'logs.nginx',
        sourceRevision: '2026-01-01T00:00:00.000Z',
        skipFeatures: false,
        skipQueries: false,
      }),
      context.request
    );
    expect(sourcesGet).toHaveBeenCalledWith('logs.nginx');
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

  it('does not let a Nightshift reader start onboarding', async () => {
    const { tool, context, managementApi } = setup({ featurePrivilege: 'read' });

    const result = await tool.handler(
      { slug: 'logs.nginx', steps: [KIsOnboardingStep.FeaturesIdentification] },
      context
    );

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
