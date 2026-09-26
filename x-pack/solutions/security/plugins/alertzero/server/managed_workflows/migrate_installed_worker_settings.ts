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
 * Rewrites installed Worker documents whose template values are missing extras keys, filling those
 * keys from the current defaults. Reconciliation re-renders from the stored values and does not
 * fill them, so this has to run before `ready()` or the upgrade keeps the old shape. A document
 * that is still invalid after the fill is left alone.
 */
export const migrateInstalledWorkerSettings = async (
  client: PluginScopedManagedWorkflowsApi,
  logger: Logger
): Promise<void> => {
  let states;
  try {
    states = await client.listInstalledWorkflowStates();
  } catch (error) {
    logger.warn(
      `Failed to read installed AlertZero workers for settings migration: ${
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
    let migrated;
    try {
      migrated = registration.settings.migrateStoredValues(state.templateValues);
      if (migrated === state.templateValues) {
        continue;
      }
      registration.settings.toSettings(migrated);
    } catch (error) {
      logger.warn(
        `Skipping settings migration for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    try {
      await installRegisteredWorker(client, registration, {
        spaceId: state.spaceId,
        workflowId: state.workflowId,
        values: migrated,
      });
      logger.info(
        `Reinstalled AlertZero worker "${state.workflowId}" in space "${state.spaceId}" with missing settings filled from defaults`
      );
    } catch (error) {
      logger.warn(
        `Failed to migrate settings for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};
