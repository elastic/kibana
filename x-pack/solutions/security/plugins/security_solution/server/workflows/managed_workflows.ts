/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { SECURITY_ALERT_VALIDATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import {
  APP_ID,
  MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG,
  MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG_DEFAULT,
} from '../../common/constants';

export const registerSecurityManagedWorkflowOwner = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerManagedWorkflowOwner(APP_ID);
};

export const installSecurityManagedWorkflows = async ({
  core,
  workflowsExtensions,
  logger,
}: {
  core: CoreStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  try {
    const isEnabled = await core.featureFlags.getBooleanValue(
      MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG,
      MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG_DEFAULT
    );

    if (!isEnabled) {
      logger.debug('Security managed alert validation workflow installation is disabled');
      return;
    }

    const managed = await workflowsExtensions.initManagedWorkflowsClient(APP_ID);
    await managed.install(SECURITY_ALERT_VALIDATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    await managed.ready();

    logger.info('Security managed alert validation workflow installed successfully');
  } catch (error) {
    logger.warn('Failed to install Security managed alert validation workflow', { error });
  }
};
