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
 * Rewrites installed Worker documents that are missing extras or schedule keys, filling those
 * keys from the current defaults. Reconciliation re-renders from the stored values and does not
 * fill them, so this has to run before `ready()` or the upgrade keeps the old shape. A document
 * that is still invalid after the fill is left alone. The install is bound to the listed document
 * version, so a settings save that landed after the list is not overwritten.
 *
 * A worker that already has a service account is left alone. This install has no request, and a
 * requestless write of a bound workflow is rejected even when the account id stays the same.
 * Applying a new default to those workers needs a workflows change that allows a same-account
 * template update without a user request.
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
      `Failed to read installed AlertZero workers while applying missing setting defaults: ${
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
    let filled;
    try {
      filled = registration.settings.withMissingDefaults(state.templateValues);
      if (filled === state.templateValues) {
        continue;
      }
      registration.settings.toSettings(filled);
    } catch (error) {
      logger.warn(
        `Skipping missing setting defaults for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    const serviceAccountId = filled.serviceAccountId;
    if (typeof serviceAccountId === 'string' && serviceAccountId.length > 0) {
      logger.warn(
        `Skipping missing setting defaults for AlertZero worker "${state.workflowId}" in space "${state.spaceId}": it has a service account, and boot cannot rewrite a bound workflow without an authenticated request`
      );
      continue;
    }
    try {
      await installRegisteredWorker(client, registration, {
        spaceId: state.spaceId,
        workflowId: state.workflowId,
        values: filled,
        expectedDocumentVersion: state.documentVersion,
      });
      logger.info(
        `Reinstalled AlertZero worker "${state.workflowId}" in space "${state.spaceId}" with missing settings filled from defaults`
      );
    } catch (error) {
      logger.warn(
        `Failed to apply missing setting defaults for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};
