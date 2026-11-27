/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

export const getRuleSearchIndexWorkflowId = (spaceId: string) =>
  `${SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID}-${spaceId}`;

/**
 * Installs the (disabled) rule search index workflow in every space at boot. A space created
 * after boot gets it from `installRuleSearchIndexWorkflowForSpace`; the next boot tracks it.
 */
export const installRuleSearchIndexWorkflows = async ({
  managedWorkflowsClient,
  spaceIds,
  logger,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceIds: readonly string[];
  logger: Logger;
}): Promise<void> => {
  const { failed } = await managedWorkflowsClient.installMany(
    spaceIds.map((spaceId) => ({
      id: SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID,
      spaceId,
      workflowIdSuffix: spaceId,
    }))
  );
  for (const { spaceId, error } of failed) {
    logger.warn(
      `Failed to install ${SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID} in space '${spaceId}'`,
      { error }
    );
  }
};

/** Idempotent; the workflow keeps its enabled state when it is already installed. */
export const installRuleSearchIndexWorkflowForSpace = async ({
  managedWorkflowsClient,
  spaceId,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceId: string;
}): Promise<string> => {
  await managedWorkflowsClient.install(SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID, {
    spaceId,
    workflowIdSuffix: spaceId,
  });
  return getRuleSearchIndexWorkflowId(spaceId);
};
