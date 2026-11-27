/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS,
  ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { ManagedWorkflowId, TemplatedManagedWorkflowId } from '@kbn/workflows/managed';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

export type EndpointWorkflowConsumerFlags = Pick<
  ExperimentalFeatures,
  'automaticTroubleshootingUniversalSkill'
>;

const workflowGroups: ReadonlyArray<{
  workflowIds: readonly Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>[];
  consumerFlags: readonly (keyof EndpointWorkflowConsumerFlags)[];
  warningLabel: string;
}> = [
  {
    workflowIds: ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS,
    consumerFlags: ['automaticTroubleshootingUniversalSkill'],
    warningLabel: 'endpoint configuration troubleshooting',
  },
  {
    workflowIds: [ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID],
    consumerFlags: ['automaticTroubleshootingUniversalSkill'],
    warningLabel: 'endpoint knowledge',
  },
];

export const syncEndpointWorkflows = async ({
  managedWorkflowsClient,
  experimentalFeatures,
  logger,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  experimentalFeatures: EndpointWorkflowConsumerFlags;
  logger: Logger;
}): Promise<void> => {
  const workflows = new Map<
    Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>,
    { enabled: boolean; warningLabel: string }
  >();
  for (const { workflowIds, consumerFlags, warningLabel } of workflowGroups) {
    const enabled = consumerFlags.some((flag) => experimentalFeatures[flag]);
    for (const workflowId of workflowIds) {
      const existing = workflows.get(workflowId);
      workflows.set(workflowId, {
        enabled: enabled || existing?.enabled === true,
        warningLabel: existing?.warningLabel ?? warningLabel,
      });
    }
  }
  for (const [workflowId, { enabled, warningLabel }] of workflows) {
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
      logger.warn(`Failed to ${action} the ${warningLabel} workflow ${workflowId}`, { error });
    }
  }
};
