/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { startKiIdentificationToolHandler } from './handler';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { SignificantEventsPausedError } from '../../../lib/errors/significant_events_paused_error';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';
import { assessSourceSampling } from '../../../lib/significant_events/features/assess_source_sampling';

jest.mock('../../../lib/significant_events/features/assess_source_sampling', () => ({
  assessSourceSampling: jest.fn().mockResolvedValue({ kind: 'supported' }),
}));

const source = {
  id: 'logs.nginx',
  slug: 'logs-nginx',
  view_name: '$.nightshift.sources.default.logs-nginx',
  esql_updated_at: '2026-01-01T00:00:00.000Z',
};

describe('startKiIdentificationToolHandler', () => {
  const setup = (maintenanceState: 'enabled' | 'paused' = 'enabled') => {
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
    const telemetry = { trackOnboardingScheduled: jest.fn() } as never;
    const streamsKIsOnboardingClient = new SignificantEventsKIsOnboardingClient({
      managementApi: { ...managementApi, getClient: jest.fn(() => managementApi) } as never,
      telemetry,
      logger: loggerMock.create(),
      getSourcesClient: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue({ source }),
      }),
    });
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue(maintenanceState),
    } as unknown as SignificantEventsMaintenanceService;

    return {
      managementApi,
      args: {
        source,
        streamsKIsOnboardingClient,
        maintenanceService,
        esClient: {} as never,
        request: httpServerMock.createKibanaRequest(),
        logger: loggerMock.create(),
      },
    };
  };

  it('triggers onboarding workflow and returns tracking Kibana path', async () => {
    const { managementApi, args } = setup();
    const { request } = args;

    const result = await startKiIdentificationToolHandler({
      ...args,
      steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
    });

    expect(result).toEqual({
      kibanaPath: '/app/nightshift/sources',
    });

    expect(managementApi.getWorkflow).toHaveBeenCalledWith('system-streams-ki-onboarding', '*');
    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-streams-ki-onboarding' }),
      'default',
      expect.objectContaining({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        skipFeatures: false,
        skipQueries: false,
      }),
      request
    );
  });

  it('rejects with SignificantEventsPausedError while paused', async () => {
    const { managementApi, args } = setup('paused');

    await expect(
      startKiIdentificationToolHandler({
        ...args,
        steps: [KIsOnboardingStep.FeaturesIdentification],
      })
    ).rejects.toBeInstanceOf(SignificantEventsPausedError);

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a refused source with a 400', async () => {
    const { managementApi, args } = setup();
    jest
      .mocked(assessSourceSampling)
      .mockResolvedValueOnce({ kind: 'unsupported', reason: 'no @timestamp' });

    await expect(
      startKiIdentificationToolHandler({
        ...args,
        steps: [KIsOnboardingStep.FeaturesIdentification],
      })
    ).rejects.toMatchObject({ statusCode: 400, message: 'no @timestamp' });

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('throws when workflow is not found', async () => {
    const { managementApi, args } = setup();
    managementApi.getWorkflow.mockResolvedValue(null);

    await expect(
      startKiIdentificationToolHandler({
        ...args,
        steps: [KIsOnboardingStep.FeaturesIdentification],
      })
    ).rejects.toThrow(/Workflow .+ not found/);
  });
});
