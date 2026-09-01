/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THREAT_INTEL_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import {
  initSecurityManagedWorkflowsClient,
  type SecurityManagedWorkflowsClient,
} from '../managed_workflows';

export const installThreatIntelManagedWorkflows = async ({
  managedWorkflowsClient,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
}): Promise<void> => {
  for (const workflowId of THREAT_INTEL_WORKFLOW_IDS) {
    await managedWorkflowsClient.install(workflowId, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  }
};

/**
 * Installs the threat-intel managed workflows in the global space. Called from
 * plugin start after bootstrap so feed ingestion and enrichment can run when the
 * feature flag is on.
 */
export const installThreatIntelManagedWorkflowsAndMarkReady = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  try {
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    await installThreatIntelManagedWorkflows({ managedWorkflowsClient });
    await managedWorkflowsClient.ready();
  } catch (error) {
    logger.warn('Failed to install threat intelligence managed workflows', { error });
  }
};
