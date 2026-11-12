/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
} from '@kbn/management-settings-ids';
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

const SLUG_MAX_LENGTH = 48;
const SKILL_ID_HASH_LENGTH = 12;

/**
 * Per-skill instance suffix: a readable slug plus a hash of the raw skill id. The slug alone is
 * lossy (`Foo.Bar`, `foo-bar` and `foo_bar` collapse, long ids truncate to one prefix), so the
 * hash keeps distinct skills on distinct workflow documents and stays deterministic across calls.
 */
export const aesopDriftMonitorWorkflowIdSuffix = (skillId: string): string => {
  const slug = skillId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  const hash = createHash('sha256').update(skillId).digest('hex').slice(0, SKILL_ID_HASH_LENGTH);
  return slug ? `skill-${slug}-${hash}` : `skill-${hash}`;
};

export const aesopDriftMonitorDocumentId = (skillId: string): string =>
  `${AESOP_DRIFT_MONITOR_WORKFLOW_ID}-${aesopDriftMonitorWorkflowIdSuffix(skillId)}`;

export interface AesopDriftMonitorDeps {
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Optional at the plugin boundary so a deployment without workflows management cannot enable monitors. */
  workflowsManagement?: AesopDriftMonitorEnablementApi;
  logger: Logger;
}

interface AesopDriftMonitorEnableParams {
  skillId: string;
  /** Display name the agent loads the skill by; falls back to the id. */
  skillName?: string;
  intervalMinutes?: number;
  lookbackMinutes?: number;
}

export const buildTemplateValues = ({
  skillId,
  skillName,
  intervalMinutes,
  lookbackMinutes,
}: AesopDriftMonitorEnableParams): AesopDriftMonitorWorkflowTemplateValues => ({
  skillId,
  skillName: skillName || skillId,
  intervalMinutes: intervalMinutes ?? AESOP_DRIFT_MONITOR_INTERVAL_MINUTES,
  lookbackMinutes: lookbackMinutes ?? AESOP_DRIFT_MONITOR_LOOKBACK_MINUTES,
});

/**
 * The monitor finds a skill's traces through the load_skill span's arguments, which Agent Builder
 * records only with tracing on and tool details included (off by default). Returns one warning per
 * setting that would leave the monitor grading nothing.
 */
export const getAesopDriftMonitorTracingWarnings = async (
  getSetting: (settingId: string) => Promise<boolean>
): Promise<string[]> => {
  const warnings: string[] = [];
  if (!(await getSetting(AGENT_BUILDER_TRACING_ENABLED_SETTING_ID))) {
    warnings.push(
      `Agent Builder tracing is off ('${AGENT_BUILDER_TRACING_ENABLED_SETTING_ID}'), so the drift monitor has no traces to grade.`
    );
  }
  if (!(await getSetting(AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID))) {
    warnings.push(
      `Tool details are not traced ('${AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID}'), so the drift monitor cannot tell which traces loaded the skill.`
    );
  }
  return warnings;
};

/** Install (disabled) + enable the monitor instance for one skill. */
export const enableAesopDriftMonitor = async (
  deps: AesopDriftMonitorRequestDeps,
  { skillId, skillName, intervalMinutes, lookbackMinutes }: AesopDriftMonitorEnableParams
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
    values: buildTemplateValues({ skillId, skillName, intervalMinutes, lookbackMinutes }),
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
