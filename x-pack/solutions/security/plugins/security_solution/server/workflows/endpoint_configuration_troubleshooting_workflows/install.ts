/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

export const syncEndpointConfigurationTroubleshootingWorkflows = async ({
  managedWorkflowsClient,
  enabled,
  logger,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  enabled: boolean;
  logger: Logger;
}): Promise<void> => {
  for (const workflowId of ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS) {
    try {
      if (enabled) {
        await managedWorkflowsClient.install(workflowId, {
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        });
      } else {
        await managedWorkflowsClient.uninstall(workflowId, {
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        });
      }
    } catch (error) {
      const action = enabled ? 'install' : 'uninstall';
      logger.warn(
        `Failed to ${action} the endpoint configuration troubleshooting workflow ${workflowId}`,
        { error }
      );
    }
  }
};
