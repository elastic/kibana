/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { getNightshiftBoundHookWorkflowId } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ResolveHookWorkflowId } from '../../agents/investigation';
import { getBoundHookIdFor } from './bound_workflows';
import {
  getBoundInvestigationWorkflowId,
  getEntryPointServiceAccountId,
  isEntryPointReady,
} from './constants';

/**
 * The workflow the Nightshift agents run for a hook. In a space set up with the service account,
 * investigations run as the agent account, and their hooks must too: Agent Builder starts a hook
 * with the agent run's request, and the workflows engine runs such a workflow as the original
 * caller. The space's bound entry point for the hook runs it as the agent account instead.
 * Elsewhere, and whenever the space's setup cannot be read, the global hook runs as before.
 */
export const createResolveHookWorkflowId =
  ({
    isServiceAccountExecutionEnabled,
    getWorkflowsManagement,
    logger,
  }: {
    isServiceAccountExecutionEnabled: () => boolean;
    getWorkflowsManagement: () => WorkflowsServerPluginSetup | undefined;
    logger: Logger;
  }): ResolveHookWorkflowId =>
  async (hookWorkflowId, { request, spaceId }) => {
    const boundHookId = getBoundHookIdFor(hookWorkflowId);
    const workflowsManagement = getWorkflowsManagement();
    if (!boundHookId || !workflowsManagement || !isServiceAccountExecutionEnabled()) {
      return hookWorkflowId;
    }
    const { management } = workflowsManagement;
    const boundHookWorkflowId = getNightshiftBoundHookWorkflowId(boundHookId, spaceId);
    try {
      const [entryPoint, boundHook] = await Promise.all([
        management.getWorkflow(getBoundInvestigationWorkflowId(spaceId), spaceId, request),
        management.getWorkflow(boundHookWorkflowId, spaceId, request),
      ]);
      // The hook runs as the space's agent account: the one its entry point is bound to.
      if (!isEntryPointReady(entryPoint)) {
        return hookWorkflowId;
      }
      if (boundHook?.definition?.settings?.run_as !== getEntryPointServiceAccountId(entryPoint)) {
        // The space is set up, so the investigation runs as the agent account, but its hook does
        // not: falling back to the global hook runs it as the user who started the run.
        logger.warn(
          `Nightshift space [${spaceId}] is set up, but its bound hook workflow [${boundHookWorkflowId}] is missing or not bound to the space's agent account. Running [${hookWorkflowId}] as the caller instead.`
        );
        return hookWorkflowId;
      }
      return boundHookWorkflowId;
    } catch (error) {
      logger.debug(`Could not read the Nightshift setup of space [${spaceId}]: ${error}`);
      return hookWorkflowId;
    }
  };
