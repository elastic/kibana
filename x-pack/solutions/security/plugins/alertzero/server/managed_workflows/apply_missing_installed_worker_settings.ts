/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installRegisteredWorker, workerRegistry } from './worker_registry';

/**
 * Rewrites installed Worker documents that are behind the current declaration: missing extras or
 * schedule keys are filled from the current defaults, and an autonomy level the Worker no longer
 * allows is lowered to the nearest allowed level below it. Reconciliation re-renders from the
 * stored values and does neither, so this has to run before `ready()` or the upgrade keeps the old
 * shape and the running workflow keeps the old level. A document that is still invalid afterwards
 * is left alone. The install is bound to the listed document version, so a settings save that
 * landed after the list is not overwritten.
 */
export const applyMissingInstalledWorkerSettings = async (
  client: PluginScopedManagedWorkflowsApi,
  logger: Logger
): Promise<void> => {
  let states;
  try {
    states = await client.listInstalledWorkflowStates();
  } catch (error) {
    logger.warn(
      `Failed to read installed AlertZero workers while upgrading stored settings: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return;
  }

  for (const state of states) {
    if (!state.definitionId || !state.templateValues) {
      continue;
    }
    const registration = workerRegistry.get(state.definitionId);
    if (!registration) {
      continue;
    }
    let upgraded;
    try {
      upgraded = registration.settings.upgradeStoredValues(state.templateValues);
      if (upgraded === state.templateValues) {
        continue;
      }
      registration.settings.toSettings(upgraded);
    } catch (error) {
      logger.warn(
        `Skipping the stored settings upgrade for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    try {
      await installRegisteredWorker(client, registration, {
        spaceId: state.spaceId,
        workflowId: state.workflowId,
        values: upgraded,
        expectedDocumentVersion: state.documentVersion,
      });
      const lowered =
        upgraded.autonomyLevel !== state.templateValues.autonomyLevel
          ? `, autonomy lowered from "${String(state.templateValues.autonomyLevel)}" to "${String(
              upgraded.autonomyLevel
            )}" because the Worker no longer allows it`
          : '';
      logger.info(
        `Reinstalled AlertZero worker "${state.workflowId}" in space "${state.spaceId}" with its stored settings upgraded to the current declaration${lowered}`
      );
    } catch (error) {
      logger.warn(
        `Failed to upgrade stored settings for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};
