/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_DETECTION_ENGINE_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { EngineAutoRunState } from '../../../common';
import { getErrorMessage } from '../errors';
import type { IEngineStorage } from '../storage/engine_storage';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

/** Workflow the prototype created by hand; it must not keep calling the engine twice a minute. */
const legacyWorkflowId = (spaceId: string) =>
  `detection-engine-prototype-autorun-${spaceId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

/**
 * Managed workflow ids are not namespaced by space at the storage layer, so each space gets its
 * own suffixed document.
 */
export const schedulerWorkflowId = (spaceId: string) =>
  `${SIGNIFICANT_EVENTS_DETECTION_ENGINE_WORKFLOW_ID}-${spaceId}`;

/** Turns the engine's server-side schedule on and off in a space. */
export interface IAutoRunScheduler {
  set(params: {
    request: KibanaRequest;
    spaceId: string;
    storage: IEngineStorage;
    enabled: boolean;
  }): Promise<EngineAutoRunState>;
}

/**
 * The schedule is a managed workflow owned by this plugin: the platform installs and upgrades
 * its definition, Task Manager triggers it every minute, and its executions show in the
 * Workflows app. Enabling it needs the user's request, because the scheduled runs use an API key
 * of whoever turned it on.
 */
export function createAutoRunScheduler({
  getManagedClient,
  management,
  logger,
}: {
  getManagedClient: () => Promise<PluginScopedManagedWorkflowsApi> | undefined;
  management: WorkflowsManagementApi | undefined;
  logger: Logger;
}): IAutoRunScheduler {
  const setEnabled = async ({
    workflowId,
    enabled,
    spaceId,
    request,
  }: {
    workflowId: string;
    enabled: boolean;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<boolean> => {
    const existing = await management!.getClient(request).getWorkflow(workflowId, spaceId);
    if (!existing) {
      return false;
    }
    if ((existing.enabled ?? false) !== enabled) {
      await management!.updateWorkflow(workflowId, { enabled }, spaceId, request);
    }
    return true;
  };

  return {
    async set({ request, spaceId, storage, enabled }) {
      const workflowId = schedulerWorkflowId(spaceId);
      const changedAt = new Date().toISOString();
      const managedClient = getManagedClient();
      const fail = async (error: string): Promise<EngineAutoRunState> => {
        const state: EngineAutoRunState = {
          enabled: false,
          workflow_id: workflowId,
          changed_at: changedAt,
          error,
        };
        await storage.state.put('auto_run', state);
        return state;
      };
      if (!managedClient || !management) {
        return fail(
          'Workflows are not available in this deployment, so auto-run cannot be scheduled.'
        );
      }

      try {
        if (enabled) {
          const client = await managedClient;
          await client.install(SIGNIFICANT_EVENTS_DETECTION_ENGINE_WORKFLOW_ID, {
            spaceId,
            workflowIdSuffix: spaceId,
          });
          if (!(await setEnabled({ workflowId, enabled: true, spaceId, request }))) {
            // Install is best effort and resolves without writing when Workflows is not ready.
            return fail('The schedule workflow could not be installed yet; try again in a minute.');
          }
        } else {
          await setEnabled({ workflowId, enabled: false, spaceId, request });
        }
        await setEnabled({
          workflowId: legacyWorkflowId(spaceId),
          enabled: false,
          spaceId,
          request,
        }).catch(() => false);
      } catch (error) {
        logger.warn(`Could not change the detection engine schedule: ${getErrorMessage(error)}`);
        return fail(getErrorMessage(error));
      }

      const state: EngineAutoRunState = { enabled, workflow_id: workflowId, changed_at: changedAt };
      await storage.state.put('auto_run', state);
      await storage.records.appendActivity([
        {
          '@timestamp': changedAt,
          step: 'operator',
          action: enabled ? 'auto_run_on' : 'auto_run_off',
          message: enabled
            ? `Auto-run on: the managed workflow "${workflowId}" runs the engine every minute on the server, with or without the page open.`
            : `Auto-run off: the workflow "${workflowId}" is disabled; the engine only runs when asked.`,
        },
      ]);
      return state;
    },
  };
}
