/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { GetWorkflowsManagement } from '../../routes/types';

/** Best-effort installs and schedules a sweep under the enabling caller's authorized identity. */
export const createEnsureFailureSweep =
  ({
    getWorkflowsManagement,
    getManagedWorkflowsClient,
    logger,
  }: {
    getWorkflowsManagement: GetWorkflowsManagement;
    getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
    logger: Pick<Logger, 'warn'>;
  }) =>
  async (request: KibanaRequest, spaceId: string): Promise<void> => {
    try {
      const management = getWorkflowsManagement()?.management;
      if (!management) return;
      const workflowId = `${NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID}-${spaceId}`;
      let workflow = await management.getClient(request).getWorkflow(workflowId, spaceId);
      if (!workflow) {
        const client = await getManagedWorkflowsClient();
        await client.install(NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        workflow = await management.getClient(request).getWorkflow(workflowId, spaceId);
      }
      if (!workflow) throw new Error('Managed failure sweep was not installed');
      if (!workflow.enabled)
        await management.updateWorkflow(workflowId, { enabled: true }, spaceId, request);
    } catch (error) {
      logger.warn(
        `Could not enable investigation failure sweep in space ${spaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };
