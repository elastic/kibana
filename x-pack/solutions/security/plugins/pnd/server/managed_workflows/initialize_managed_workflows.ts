/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { PND_MANAGED_WATCH_WORKFLOW_IDS, PND_RULE_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { PND_MANAGED_WORKFLOW_OWNER_ID } from '../../common/constants';
import { installRegisteredWatch, watchRegistry } from './watch_registry';

/** Matches `getManagedWorkflowDocumentsAllSpaces` (`size: 1000`) in workflow_crud_service. */
const MANAGED_WORKFLOW_STATE_LIST_CAP = 1000;

export const initializeManagedWorkflows = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<PluginScopedManagedWorkflowsApi> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(
    PND_MANAGED_WORKFLOW_OWNER_ID
  );
  // Reconciliation re-renders every dynamic auto-managed document. If any install or settings
  // migration is unsafe, skip the whole pass so one incompatible document cannot be rewritten by
  // the new definition. The next Kibana start retries the complete pass.
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

  try {
    const states = await client.listInstalledWorkflowStates();
    if (states.length >= MANAGED_WORKFLOW_STATE_LIST_CAP) {
      canReconcile = false;
      logger.warn(
        `PND managed workflow list hit the ${MANAGED_WORKFLOW_STATE_LIST_CAP}-document read cap; skipping reconciliation`
      );
    }
    for (const state of states) {
      if (!state.definitionId) continue;

      if (
        state.spaceId === GLOBAL_WORKFLOW_SPACE_ID &&
        PND_MANAGED_WATCH_WORKFLOW_IDS.includes(
          state.definitionId as (typeof PND_MANAGED_WATCH_WORKFLOW_IDS)[number]
        )
      ) {
        try {
          await client.uninstall(
            state.definitionId as (typeof PND_MANAGED_WATCH_WORKFLOW_IDS)[number],
            { spaceId: GLOBAL_WORKFLOW_SPACE_ID, workflowId: state.workflowId }
          );
        } catch (error) {
          canReconcile = false;
          logger.warn(
            `Failed to remove legacy global PND watch "${state.workflowId}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        continue;
      }

      const registration = watchRegistry.get(state.definitionId);
      if (!registration?.settings) continue;

      try {
        const migration = state.templateValues
          ? registration.settings.migrate(state.templateValues)
          : {
              values: registration.settings.createDefaultValues(),
              migrated: true,
            };
        if (migration.migrated) {
          await installRegisteredWatch(client, registration, {
            spaceId: state.spaceId,
            workflowId: state.workflowId,
            values: migration.values,
          });
        }
      } catch (error) {
        canReconcile = false;
        logger.warn(
          `Failed to migrate settings for PND watch "${state.workflowId}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  } catch (error) {
    canReconcile = false;
    logger.warn(
      `Failed to read persisted PND watch settings before reconciliation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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

  return client;
};
