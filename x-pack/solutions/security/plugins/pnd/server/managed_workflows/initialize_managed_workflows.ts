/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { PND_RULE_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { PND_MANAGED_WORKFLOW_OWNER_ID } from '../../common/constants';

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
    PND_MANAGED_WORKFLOW_OWNER_ID
  );
  let canReconcile = true;

  // Install dependencies before their callers so a definition upgrade cannot
  // activate a parent whose child still has the previous input contract.
  for (const id of PND_RULE_WORKFLOW_IDS) {
    try {
      await client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    } catch (error) {
      canReconcile = false;
      logger.error(
        `Failed to install managed PND rule workflow "${id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      break;
    }
  }

  if (canReconcile) {
    try {
      await client.ready();
      logger.info('PND managed workflows initialized');
    } catch (error) {
      logger.warn(
        `PND managed workflow reconciliation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    logger.warn('PND managed workflow reconciliation skipped because initialization degraded');
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
