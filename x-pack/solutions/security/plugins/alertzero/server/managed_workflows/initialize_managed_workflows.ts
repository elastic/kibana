/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  ALERTZERO_ACTION_WORKFLOW_IDS,
  ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ALERTZERO_RULE_WORKFLOW_IDS,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { ALERTZERO_MANAGED_WORKFLOW_OWNER_ID } from '../../common/constants';

export const initializeManagedWorkflows = async ({
  workflowsExtensions,
  logger,
  ensureAgentForSpace,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
  ensureAgentForSpace?: (spaceId: string) => Promise<void>;
}): Promise<PluginScopedManagedWorkflowsApi> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(
    ALERTZERO_MANAGED_WORKFLOW_OWNER_ID
  );
  let canReconcile = true;

  // AlertZero action catalog entries install alongside the rule workflows:
  // all are global and static.
  const globalWorkflowIds = [
    ...ALERTZERO_RULE_WORKFLOW_IDS,
    ...ALERTZERO_ACTION_WORKFLOW_IDS,
    ...ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ] as const;

  const globalWorkflowInstalls = await Promise.allSettled(
    globalWorkflowIds.map((id) => client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
  );
  for (const [index, result] of globalWorkflowInstalls.entries()) {
    if (result.status === 'rejected') {
      canReconcile = false;
      logger.error(
        // Covers rule and action workflows, so this stays generic.
        `Failed to install managed AlertZero workflow "${globalWorkflowIds[index]}": ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`
      );
    }
  }

  if (canReconcile) {
    try {
      await client.ready();
      logger.info('AlertZero managed workflows initialized');
    } catch (error) {
      logger.warn(
        `AlertZero managed workflow reconciliation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    logger.warn(
      'AlertZero managed workflow reconciliation skipped because initialization degraded'
    );
  }

  if (ensureAgentForSpace) {
    try {
      const states = await client.listInstalledWorkflowStates();
      const workerSpaces = [
        ...new Set(
          states
            .map((s) => s.spaceId)
            .filter((id): id is string => !!id && id !== GLOBAL_WORKFLOW_SPACE_ID)
        ),
      ];
      const agentResults = await Promise.allSettled(
        workerSpaces.map((spaceId) => ensureAgentForSpace(spaceId))
      );

      for (const [index, result] of agentResults.entries()) {
        if (result.status === 'rejected') {
          logger.warn(
            `Failed to ensure agent for space "${workerSpaces[index]}": ${
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            }`
          );
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to ensure agents for existing worker spaces: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return client;
};
