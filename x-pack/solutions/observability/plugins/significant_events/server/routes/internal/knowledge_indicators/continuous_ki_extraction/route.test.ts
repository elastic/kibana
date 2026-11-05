/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_INTERVAL_HOURS,
} from '@kbn/management-settings-ids';
import { internalKIContinuousKIExtractionRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalKIContinuousKIExtractionRoutes[
    'PUT /internal/streams/_knowledge_indicators/continuous_ki_extraction/settings'
  ];

type HandlerParams = Parameters<typeof route.handler>[0];

describe('continuous KI extraction settings route', () => {
  it('rolls back both settings when an enabled transition fails', async () => {
    const request = { spaceId: 'space-a' };
    const previousSettings = {
      [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]: false,
      [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]: 12,
    };
    const uiSettingsClient = {
      getAll: jest.fn().mockResolvedValue(previousSettings),
      get: jest.fn().mockResolvedValue(false),
      set: jest.fn().mockResolvedValue(undefined),
      setMany: jest.fn().mockResolvedValue(undefined),
    };
    const continuousOnboardingWorkflowService = {
      ensureWorkflow: jest.fn().mockRejectedValue(new Error('workflow sync failed')),
    };
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue('enabled'),
    };
    const logger = { warn: jest.fn() };
    const handlerParams = {
      params: {
        body: {
          continuousKiExtraction: {
            enabled: true,
            intervalHours: 24,
          },
        },
      },
      request,
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient,
      }),
      server: {},
      continuousOnboardingWorkflowService,
      maintenanceService,
      logger,
      response: {},
      context: {},
    } as unknown as HandlerParams;

    await expect(route.handler(handlerParams)).rejects.toThrow('workflow sync failed');

    expect(uiSettingsClient.setMany).toHaveBeenNthCalledWith(1, {
      [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]: 24,
    });
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      1,
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
      true
    );
    expect(continuousOnboardingWorkflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request,
      spaceId: request.spaceId,
    });
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      2,
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
      false
    );
    expect(uiSettingsClient.setMany).toHaveBeenNthCalledWith(2, {
      [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]: 12,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
