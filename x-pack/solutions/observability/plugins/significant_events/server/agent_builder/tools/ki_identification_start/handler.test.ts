/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { startKiIdentificationToolHandler } from './handler';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { SignificantEventsPausedError } from '../../../lib/errors/significant_events_paused_error';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import type { SignificantEventsServer } from '../../../types';
import { SignificantEventsKIsOnboardingClient } from '../../../lib/workflows/onboarding_workflow_client';

describe('startKiIdentificationToolHandler', () => {
  const setup = (
    maintenanceState: 'enabled' | 'paused' = 'enabled',
    principal: { type: 'service_account'; serviceAccountId: string } | undefined = undefined
  ) => {
    const managementApi = {
      getWorkflow: jest.fn().mockResolvedValue({
        id: 'system-sources-ki-onboarding-bound-default',
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
      getSourcesClient: jest.fn().mockResolvedValue({
        get: jest.fn().mockResolvedValue({ source: { id: 'logs.nginx', slug: 'logs-nginx' } }),
      }),
    });
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue(maintenanceState),
    } as unknown as SignificantEventsMaintenanceService;

    const getConnectorById = jest
      .fn()
      .mockImplementation(async (connectorId: string) => ({ connectorId }));
    const server = {
      inference: { getConnectorById },
      core: {
        security: {
          authc: { getPrincipal: jest.fn(() => principal) },
          serviceAccounts: {
            isEnabled: () => true,
            getWorkloadBinding: jest
              .fn()
              .mockResolvedValue({ serviceAccountId: 'kibana/detection' }),
          },
        },
        savedObjects: { getScopedClient: jest.fn() },
        uiSettings: {
          asScopedToClient: jest.fn(() => ({ get: jest.fn().mockResolvedValue(false) })),
        },
      },
    } as unknown as Pick<SignificantEventsServer, 'inference' | 'core'>;

    return {
      server,
      getConnectorById,
      managementApi,
      streamsKIsOnboardingClient,
      maintenanceService,
      request: httpServerMock.createKibanaRequest(),
    };
  };

  it('triggers onboarding workflow and returns tracking Kibana path', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request, server } =
      setup();

    const result = await startKiIdentificationToolHandler({
      sourceId: 'logs.nginx',
      sourceSlug: 'logs-nginx',
      steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
      server,
      streamsKIsOnboardingClient,
      maintenanceService,
      request,
    });

    expect(result).toEqual({
      kibanaPath: '/app/nightshift/sources',
    });

    expect(managementApi.getWorkflow).toHaveBeenCalledWith(
      'system-sources-ki-onboarding-bound-default',
      'default'
    );
    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-sources-ki-onboarding-bound-default' }),
      'default',
      expect.objectContaining({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        skipFeatures: false,
        skipQueries: false,
      }),
      request,
      'nightshift-detection-engine'
    );
  });

  it('refuses a service account that is not the space detection account before the run starts', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request, server } =
      setup('enabled', { type: 'service_account', serviceAccountId: 'kibana/other' });

    await expect(
      startKiIdentificationToolHandler({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification],
        server,
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects with SignificantEventsPausedError while paused', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request, server } =
      setup('paused');

    await expect(
      startKiIdentificationToolHandler({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification],
        server,
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toBeInstanceOf(SignificantEventsPausedError);

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('throws the not-set-up error when the space has no bound workflow', async () => {
    const { managementApi, streamsKIsOnboardingClient, maintenanceService, request, server } =
      setup();
    managementApi.getWorkflow.mockResolvedValue(null);

    await expect(
      startKiIdentificationToolHandler({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification],
        server,
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toThrow(/not set up/);
  });

  it('resolves requested connectors as the caller and starts the run with the resolved ids', async () => {
    const {
      managementApi,
      getConnectorById,
      streamsKIsOnboardingClient,
      maintenanceService,
      request,
      server,
    } = setup();

    await startKiIdentificationToolHandler({
      sourceId: 'logs.nginx',
      sourceSlug: 'logs-nginx',
      steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
      connectors: { features: 'features-connector', queries: 'queries-connector' },
      server,
      streamsKIsOnboardingClient,
      maintenanceService,
      request,
    });

    expect(getConnectorById).toHaveBeenCalledWith('features-connector', request);
    expect(getConnectorById).toHaveBeenCalledWith('queries-connector', request);
    expect(managementApi.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      'default',
      expect.objectContaining({ featuresConnectorId: 'features-connector' }),
      request,
      'nightshift-detection-engine'
    );
  });

  it('refuses a connector the caller cannot use before the run starts', async () => {
    const {
      managementApi,
      getConnectorById,
      streamsKIsOnboardingClient,
      maintenanceService,
      request,
      server,
    } = setup();
    getConnectorById.mockRejectedValue(new Error('Connector not found'));

    await expect(
      startKiIdentificationToolHandler({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification],
        connectors: { features: 'private-connector' },
        server,
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toThrow('Connector not found');

    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('resolves the default connector as the caller when no connector is requested', async () => {
    const {
      managementApi,
      getConnectorById,
      streamsKIsOnboardingClient,
      maintenanceService,
      request,
      server,
    } = setup();
    getConnectorById.mockRejectedValue(new Error('Connector not accessible'));

    await expect(
      startKiIdentificationToolHandler({
        sourceId: 'logs.nginx',
        sourceSlug: 'logs-nginx',
        steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
        server,
        streamsKIsOnboardingClient,
        maintenanceService,
        request,
      })
    ).rejects.toThrow('Connector not accessible');

    expect(getConnectorById).toHaveBeenCalledWith(expect.any(String), request);
    expect(managementApi.runWorkflow).not.toHaveBeenCalled();
  });
});
