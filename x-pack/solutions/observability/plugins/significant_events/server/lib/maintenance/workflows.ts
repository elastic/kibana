/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import {
  shouldRestoreSettingsBackedWorkflow,
  type PausedFeatureSettings,
} from './feature_settings';
import {
  buildCancelTargets,
  buildDisableTargets,
  type MaintenanceWorkflowTarget,
} from './managed_workflow_targets';
import { toMessage } from './to_message';

export type ManagementApi = WorkflowsServerPluginSetup['management'];

export const workflowKey = ({ id, spaceId }: MaintenanceWorkflowTarget): string =>
  `${id}@${spaceId}`;

const disableWorkflow = async (
  mgmt: ManagementApi,
  { id, spaceId }: MaintenanceWorkflowTarget,
  request: KibanaRequest,
  failures: SignificantEventsMaintenanceFailure[]
): Promise<boolean> => {
  const target = `workflow:${id}@${spaceId}`;
  try {
    const workflow = await mgmt.getClient(request).getWorkflow(id, spaceId);
    if (!workflow || !workflow.enabled) {
      return false;
    }
    const result = await mgmt.updateWorkflow(id, { enabled: false }, spaceId, request);
    if (result.enabled !== false) {
      failures.push({
        target,
        error: result.validationErrors.join('; ') || 'workflow was not disabled',
      });
      return false;
    }
    return true;
  } catch (error) {
    failures.push({ target, error: toMessage(error) });
    return false;
  }
};

/**
 * Best-effort cancel of every non-terminal execution for a workflow target.
 * Delegates paging/cancel to workflows management; missing workflows are a no-op.
 */
const cancelTargetExecutions = async (
  mgmt: ManagementApi,
  { id, spaceId }: MaintenanceWorkflowTarget,
  request: KibanaRequest,
  failures: SignificantEventsMaintenanceFailure[]
): Promise<void> => {
  try {
    await mgmt.cancelAllActiveWorkflowExecutions(id, spaceId, request);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return;
    }
    failures.push({ target: `execution:${id}@${spaceId}`, error: toMessage(error) });
  }
};

/**
 * Disable every managed workflow target and cancel its executions. Returns
 * the targets this call actually disabled; records a single `workflows`
 * failure when workflows management is unavailable.
 */
export const sweepWorkflows = async ({
  mgmt,
  spaceIds,
  request,
  failures,
}: {
  mgmt: ManagementApi | undefined;
  spaceIds: SpaceId[];
  request: KibanaRequest;
  failures: SignificantEventsMaintenanceFailure[];
}): Promise<MaintenanceWorkflowTarget[]> => {
  if (!mgmt) {
    failures.push({
      target: 'workflows',
      error: 'Workflows management plugin is not available',
    });
    return [];
  }
  const newlyDisabled: MaintenanceWorkflowTarget[] = [];
  for (const target of buildDisableTargets(spaceIds)) {
    if (await disableWorkflow(mgmt, target, request, failures)) {
      newlyDisabled.push(target);
    }
  }
  for (const target of buildCancelTargets(spaceIds)) {
    await cancelTargetExecutions(mgmt, target, request, failures);
  }
  return newlyDisabled;
};

/**
 * Re-enable a single workflow.
 * - `toggled`: disable→enable update succeeded
 * - `already` / `gone`: no longer needs resume (already on, or deleted)
 * - `failed`: keep in the disabled snapshot for retry
 */
export const reEnableWorkflow = async (
  mgmt: ManagementApi,
  { id, spaceId }: MaintenanceWorkflowTarget,
  request: KibanaRequest,
  failures: SignificantEventsMaintenanceFailure[],
  reportMissing = true
): Promise<'toggled' | 'already' | 'gone' | 'failed'> => {
  const target = `workflow:${id}@${spaceId}`;
  try {
    const workflow = await mgmt.getClient(request).getWorkflow(id, spaceId);
    if (!workflow) {
      if (reportMissing) {
        // Gone — surface it, but don't keep the deployment paused on a workflow
        // that no longer exists.
        failures.push({ target, error: 'workflow not found' });
      }
      return 'gone';
    }
    if (workflow.enabled) {
      return 'already';
    }
    if (!workflow.definition) {
      // Transient (installer hasn't finished); keep recorded so resume retries.
      failures.push({ target, error: 'workflow is not fully installed yet' });
      return 'failed';
    }
    const result = await mgmt.updateWorkflow(id, { enabled: true }, spaceId, request);
    if (result.enabled !== true) {
      failures.push({
        target,
        error: result.validationErrors.join('; ') || 'workflow was not enabled',
      });
      return 'failed';
    }
    return 'toggled';
  } catch (error) {
    failures.push({ target, error: toMessage(error) });
    return 'failed';
  }
};

/**
 * Reset step: re-enable the workflows reset (or an earlier pause) disabled,
 * except settings-backed ones, which stay off alongside their toggles. A
 * settings-backed workflow whose toggle could not be turned off (`settingsStillOn`)
 * is restored too, so a toggle never reads "on" with its workflow disabled.
 * Returns the workflows that failed to re-enable so a later Resume can retry them.
 */
export const restoreWorkflowsAfterReset = async ({
  mgmt,
  workflows,
  settingsStillOn,
  request,
  failures,
}: {
  mgmt: ManagementApi | undefined;
  workflows: MaintenanceWorkflowTarget[];
  settingsStillOn: PausedFeatureSettings;
  request: KibanaRequest;
  failures: SignificantEventsMaintenanceFailure[];
}): Promise<MaintenanceWorkflowTarget[]> => {
  const eligible = workflows.filter((workflow) =>
    shouldRestoreSettingsBackedWorkflow(workflow, settingsStillOn)
  );
  if (!mgmt) {
    return eligible;
  }
  const remaining: MaintenanceWorkflowTarget[] = [];
  for (const workflow of eligible) {
    if ((await reEnableWorkflow(mgmt, workflow, request, failures, false)) === 'failed') {
      remaining.push(workflow);
    }
  }
  return remaining;
};
