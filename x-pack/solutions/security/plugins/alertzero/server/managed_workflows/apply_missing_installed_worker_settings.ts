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
 * Must run before `ready()`: reconciliation re-renders from stored values without upgrading them.
 * Each rewrite is bound to the listed document version so a later settings save is not overwritten.
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
      const autonomyLoweredNote =
        upgraded.autonomyLevel !== state.templateValues.autonomyLevel
          ? `, lowering autonomy from "${String(state.templateValues.autonomyLevel)}" to "${String(
              upgraded.autonomyLevel
            )}" because the Worker no longer allows it`
          : '';
      logger.info(
        `Requested a reinstall of AlertZero worker "${state.workflowId}" in space "${state.spaceId}" with its stored settings upgraded to the current declaration${autonomyLoweredNote}. The write is skipped if the document changed since it was read.`
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
