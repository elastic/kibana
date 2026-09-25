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
 * Drops a filled `scheduleInterval` back out of a write that would otherwise persist it. This
 * pass's `install` call rewrites the workflow YAML but never calls `management.updateWorkflow`,
 * so a schedule change made here would desync Task Manager's registered task from what the
 * document (and the workers API) report. The read path fills `scheduleInterval` again on every
 * read regardless (`parseWorkerValues`), so holding it back here does not break the settings
 * panel — it only defers the schedule fill to the next settings save or enable, which does call
 * `updateWorkflow` and resyncs the scheduler.
 */
const withoutScheduleChange = (
  stored: Record<string, unknown>,
  filled: Record<string, unknown>
): Record<string, unknown> => {
  if (Object.hasOwn(stored, 'scheduleInterval')) {
    return filled;
  }
  const { scheduleInterval: _drop, ...rest } = filled;
  return rest;
};

/**
 * Rewrites installed Worker documents that are missing extras or schedule keys, filling those
 * keys from the current defaults. Reconciliation re-renders from the stored values and does not
 * fill them, so this has to run before `ready()` or the upgrade keeps the old shape. A document
 * that is still invalid after the fill is left alone.
 *
 * A filled `scheduleInterval` is deliberately NOT persisted here: this pass only rewrites the
 * document, it never resyncs Task Manager, so persisting a schedule change this way would leave
 * the registered task on the old interval while the document reports the new one. Extras have no
 * such coupling and are persisted normally.
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
    let toPersist;
    try {
      const filled = registration.settings.withMissingDefaults(state.templateValues);
      if (filled === state.templateValues) {
        continue;
      }
      if (!Object.hasOwn(state.templateValues, 'scheduleInterval')) {
        logger.warn(
          `AlertZero worker "${state.workflowId}" in space "${state.spaceId}" is missing scheduleInterval. This startup pass fills extras but leaves the schedule unfilled, because filling it here would desync Task Manager from the reported default. Save the worker's settings once to resync it.`
        );
      }
      toPersist = withoutScheduleChange(state.templateValues, filled);
      if (toPersist === state.templateValues) {
        continue;
      }
      registration.settings.toSettings(toPersist);
    } catch (error) {
      logger.warn(
        `Skipping missing setting defaults for AlertZero worker "${state.workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    try {
      await installRegisteredWorker(client, registration, {
        spaceId: state.spaceId,
        workflowId: state.workflowId,
        values: toPersist,
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
