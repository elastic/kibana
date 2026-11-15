/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AESOP_EXPLORER_WORKFLOW_ID,
  type AesopExplorerMode,
  type AesopExplorerWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { AesopDriftMonitorRequestDeps } from './drift_monitor_schedule';

/**
 * One explorer instance per mode in the request's space. Install writes it disabled; enabling it
 * registers the schedule under an API key minted from this request. Instances live in the
 * request's concrete space: scheduling global workflows is unsupported.
 */

export type AesopExplorerRequestDeps = AesopDriftMonitorRequestDeps;

export type AesopExplorerEnableParams = AesopExplorerWorkflowTemplateValues;

export const aesopExplorerDocumentId = (mode: AesopExplorerMode): string =>
  `${AESOP_EXPLORER_WORKFLOW_ID}-${mode}`;

/** Install (disabled) + enable the explorer instance for one mode. */
export const enableAesopExplorer = async (
  deps: AesopExplorerRequestDeps,
  values: AesopExplorerEnableParams
): Promise<{ documentId: string }> => {
  const { workflowsManagement, logger, spaceId } = deps;
  if (!workflowsManagement) {
    throw new Error(
      'Cannot enable the AESOP explorer: the workflows management plugin is not available to enable the workflow, and installing it alone would leave it unscheduled.'
    );
  }

  const client = await deps.getManagedWorkflowsClient();
  const documentId = aesopExplorerDocumentId(values.mode);

  await client.install(AESOP_EXPLORER_WORKFLOW_ID, {
    spaceId,
    workflowIdSuffix: values.mode,
    values,
  });

  // Installing writes the workflow document and stops there; enabling puts the scheduled trigger
  // in front of Task Manager under an API key minted from this request.
  await workflowsManagement.updateWorkflow(documentId, { enabled: true }, spaceId, deps.request);
  logger.debug(() => `Enabled AESOP explorer (${documentId}) in space '${spaceId}'`);
  return { documentId };
};

/** Remove the explorer instance document for one mode. */
export const uninstallAesopExplorer = async (
  deps: Pick<AesopExplorerRequestDeps, 'getManagedWorkflowsClient' | 'logger' | 'spaceId'>,
  { mode }: { mode: AesopExplorerMode }
): Promise<void> => {
  const client = await deps.getManagedWorkflowsClient();
  await client.uninstall(AESOP_EXPLORER_WORKFLOW_ID, {
    spaceId: deps.spaceId,
    workflowIdSuffix: mode,
  });
  deps.logger.debug(() => `Uninstalled AESOP explorer (${mode})`);
};
