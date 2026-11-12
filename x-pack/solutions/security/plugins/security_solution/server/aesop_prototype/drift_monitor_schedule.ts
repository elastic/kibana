/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  AESOP_DRIFT_MONITOR_WORKFLOW_ID,
  type AesopDriftMonitorWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server';
import {
  AESOP_DRIFT_MONITOR_INTERVAL_MINUTES,
  AESOP_DRIFT_MONITOR_LOOKBACK_MINUTES,
} from '../../common/aesop_prototype';

/**
 * One drift-monitor instance per skill. Install writes it disabled; enabling it
 * registers the schedule under an API key minted from this request.
 *
 * Instances live in the request's concrete space: scheduling global workflows
 * is unsupported (elastic/security-team#17380).
 */

/** The one workflows management call this module makes, declared structurally rather than imported:
 * workflows management reaches back through Agent Builder, so depending on its contract would close
 * a project reference cycle (same pattern as context_engine's `WorkflowEnablementApi`). */
export interface AesopDriftMonitorEnablementApi {
  updateWorkflow(
    workflowId: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<unknown>;
}

const SUFFIX_MAX_LENGTH = 64;

/** Per-skill instance suffix, stable and filesystem-safe. */
export const aesopDriftMonitorWorkflowIdSuffix = (skillId: string): string => {
  const slug = skillId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = `skill-${slug}`.slice(0, SUFFIX_MAX_LENGTH);
  // A skill id of only punctuation collapses to the bare prefix; keep instances distinct.
  return suffix === 'skill' ? `skill-${Date.now()}` : suffix;
};

export const aesopDriftMonitorDocumentId = (skillId: string): string =>
  `${AESOP_DRIFT_MONITOR_WORKFLOW_ID}-${aesopDriftMonitorWorkflowIdSuffix(skillId)}`;

export interface AesopDriftMonitorDeps {
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Optional at the plugin boundary so a deployment without workflows management cannot enable monitors. */
  workflowsManagement?: AesopDriftMonitorEnablementApi;
  logger: Logger;
}

const buildTemplateValues = ({
  skillId,
  intervalMinutes,
  lookbackMinutes,
}: {
  skillId: string;
  intervalMinutes?: number;
  lookbackMinutes?: number;
}): AesopDriftMonitorWorkflowTemplateValues => ({
  skillId,
  intervalMinutes: intervalMinutes ?? AESOP_DRIFT_MONITOR_INTERVAL_MINUTES,
  lookbackMinutes: lookbackMinutes ?? AESOP_DRIFT_MONITOR_LOOKBACK_MINUTES,
});

/** Install (disabled) + enable the monitor instance for one skill. */
export const enableAesopDriftMonitor = async (
  deps: AesopDriftMonitorRequestDeps,
  {
    skillId,
    intervalMinutes,
    lookbackMinutes,
  }: { skillId: string; intervalMinutes?: number; lookbackMinutes?: number }
): Promise<{ documentId: string }> => {
  const { workflowsManagement, logger, spaceId } = deps;
  if (!workflowsManagement) {
    throw new Error(
      'Cannot enable the AESOP drift monitor: the workflows management plugin is not available to enable the workflow, and installing it alone would leave it unscheduled.'
    );
  }

  const client = await deps.getManagedWorkflowsClient();
  const workflowIdSuffix = aesopDriftMonitorWorkflowIdSuffix(skillId);
  const documentId = aesopDriftMonitorDocumentId(skillId);

  await client.install(AESOP_DRIFT_MONITOR_WORKFLOW_ID, {
    spaceId,
    workflowIdSuffix,
    values: buildTemplateValues({ skillId, intervalMinutes, lookbackMinutes }),
  });

  // Installing writes the workflow document and stops there. Enabling is what puts the
  // scheduled trigger in front of Task Manager under an API key minted from this request —
  // the same split as the context_engine feedback-analysis schedule.
  await workflowsManagement.updateWorkflow(documentId, { enabled: true }, spaceId, deps.request);
  logger.debug(() => `Enabled AESOP drift monitor for skill '${skillId}' (${documentId})`);
  return { documentId };
};

/** Disable (never delete) the monitor instance for one skill, keeping the template document. */
export const disableAesopDriftMonitor = async (
  deps: AesopDriftMonitorRequestDeps,
  { skillId }: { skillId: string }
): Promise<void> => {
  const { workflowsManagement, logger, spaceId } = deps;
  if (!workflowsManagement) {
    logger.warn('Cannot disable the AESOP drift monitor: workflows management is unavailable.');
    return;
  }
  await workflowsManagement.updateWorkflow(
    aesopDriftMonitorDocumentId(skillId),
    { enabled: false },
    spaceId,
    deps.request
  );
  logger.debug(() => `Disabled AESOP drift monitor for skill '${skillId}'`);
};

/** Remove the monitor instance document for one skill. */
export const uninstallAesopDriftMonitor = async (
  deps: Pick<AesopDriftMonitorDeps, 'getManagedWorkflowsClient' | 'logger'> & {
    spaceId: string;
  },
  { skillId }: { skillId: string }
): Promise<void> => {
  const client = await deps.getManagedWorkflowsClient();
  await client.uninstall(AESOP_DRIFT_MONITOR_WORKFLOW_ID, {
    spaceId: deps.spaceId,
    workflowIdSuffix: aesopDriftMonitorWorkflowIdSuffix(skillId),
  });
  deps.logger.debug(() => `Uninstalled AESOP drift monitor for skill '${skillId}'`);
};

/** Request-scoped accessor bundle the routes hand to the schedule calls. */
export interface AesopDriftMonitorRequestDeps extends AesopDriftMonitorDeps {
  request: KibanaRequest;
  /** Concrete space of the deploying request; never the global `*` space (see module comment). */
  spaceId: string;
}
