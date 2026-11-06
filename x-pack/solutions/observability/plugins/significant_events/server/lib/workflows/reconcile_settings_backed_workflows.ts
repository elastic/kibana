/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import type { ContinuousOnboardingWorkflowService } from './continuous_onboarding_workflow';
import { readScheduledDiscoveryConfig } from './scheduled_discovery_settings';
import type { SignificantEventsScheduledWorkflowsService } from './significant_events_scheduled_workflows';

/**
 * Installs the workflows the space's settings ask for, bound to the space's current account.
 * Continuous onboarding and the scheduled discovery pair carry the setting's values, so setup
 * cannot install them blindly; a setting that is already on has no route call to install them
 * after an upgrade, and a rebinding to another account has to reach them too. Installing again
 * keeps the enabled state, and a setting that is off installs nothing.
 */
export const reconcileSettingsBackedWorkflows = async ({
  uiSettingsClient,
  continuousOnboardingService,
  scheduledDiscoveryService,
  request,
  spaceId,
}: {
  uiSettingsClient: IUiSettingsClient;
  continuousOnboardingService?: ContinuousOnboardingWorkflowService;
  scheduledDiscoveryService?: SignificantEventsScheduledWorkflowsService;
  request: KibanaRequest;
  spaceId: string;
}): Promise<void> => {
  const settings = await uiSettingsClient.getAll<unknown>();

  if (
    continuousOnboardingService &&
    settings[OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED] === true
  ) {
    await continuousOnboardingService.ensureWorkflow({ enabled: true, request, spaceId });
  }

  if (
    scheduledDiscoveryService &&
    settings[OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED] === true
  ) {
    await scheduledDiscoveryService.ensureWorkflow({
      enabled: true,
      request,
      spaceId,
      config: readScheduledDiscoveryConfig(settings),
    });
  }
};
