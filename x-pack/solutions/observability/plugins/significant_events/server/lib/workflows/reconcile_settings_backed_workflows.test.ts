/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import { DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES } from '../../../common/constants';
import type { ContinuousOnboardingWorkflowService } from './continuous_onboarding_workflow';
import { reconcileSettingsBackedWorkflows } from './reconcile_settings_backed_workflows';
import type { SignificantEventsScheduledWorkflowsService } from './significant_events_scheduled_workflows';

const request = { spaceId: 'space-a' } as KibanaRequest;

const setup = (settings: Record<string, unknown>) => {
  const continuousOnboardingService = {
    ensureWorkflow: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<ContinuousOnboardingWorkflowService>;
  const scheduledDiscoveryService = {
    ensureWorkflow: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<SignificantEventsScheduledWorkflowsService>;
  const uiSettingsClient = {
    getAll: jest.fn().mockResolvedValue(settings),
  } as unknown as IUiSettingsClient;
  const run = () =>
    reconcileSettingsBackedWorkflows({
      uiSettingsClient,
      continuousOnboardingService,
      scheduledDiscoveryService,
      request,
      spaceId: 'space-a',
    });
  return { run, continuousOnboardingService, scheduledDiscoveryService };
};

describe('reconcileSettingsBackedWorkflows', () => {
  it('installs the workflows of the settings that are on, with the stored values and defaults', async () => {
    const { run, continuousOnboardingService, scheduledDiscoveryService } = setup({
      [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]: true,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: true,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 7,
    });

    await run();

    expect(continuousOnboardingService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request,
      spaceId: 'space-a',
    });
    expect(scheduledDiscoveryService.ensureWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        config: expect.objectContaining({
          detectionIntervalMinutes: 7,
          reviewIntervalMinutes: DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
        }),
      })
    );
  });

  it('installs nothing for settings that are off', async () => {
    const { run, continuousOnboardingService, scheduledDiscoveryService } = setup({
      [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]: false,
    });

    await run();

    expect(continuousOnboardingService.ensureWorkflow).not.toHaveBeenCalled();
    expect(scheduledDiscoveryService.ensureWorkflow).not.toHaveBeenCalled();
  });
});
