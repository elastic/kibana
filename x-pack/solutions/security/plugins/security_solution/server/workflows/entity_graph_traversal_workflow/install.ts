/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

/**
 * Install the manual-only entity graph traversal workflow once, in the global space, so it is
 * visible from and executable in every space. It has no schedule and no trigger other than a
 * manual run with a scenario id and a seed id.
 */
export const installSecurityEntityGraphTraversalWorkflow = async ({
  managedWorkflowsClient,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
}): Promise<void> => {
  await managedWorkflowsClient.install(SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID, {
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  });
};
