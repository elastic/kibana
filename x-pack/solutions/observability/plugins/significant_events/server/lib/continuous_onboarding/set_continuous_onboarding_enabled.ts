/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED } from '@kbn/management-settings-ids';
import type { ContinuousOnboardingWorkflowService } from '../workflows/continuous_onboarding_workflow';

export const setContinuousOnboardingEnabled = async ({
  uiSettingsClient,
  workflowService,
  request,
  spaceId,
  enabled,
  logger,
  waitForRunningExecutions,
}: {
  uiSettingsClient: IUiSettingsClient;
  workflowService: ContinuousOnboardingWorkflowService;
  request: KibanaRequest;
  spaceId: string;
  enabled: boolean;
  logger: Logger;
  waitForRunningExecutions?: boolean;
}): Promise<void> => {
  const previousEnabled = await uiSettingsClient.get<boolean>(
    OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED
  );
  if (previousEnabled === enabled) {
    return;
  }

  await uiSettingsClient.set(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED, enabled);

  try {
    await workflowService.ensureWorkflow({
      enabled,
      request,
      spaceId,
      ...(waitForRunningExecutions === undefined ? {} : { waitForRunningExecutions }),
    });
  } catch (error) {
    await uiSettingsClient
      .set(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED, previousEnabled)
      .catch((rollbackError) => {
        logger.warn(`Failed to rollback settings after workflow sync error: ${rollbackError}`);
      });
    throw error;
  }
};
