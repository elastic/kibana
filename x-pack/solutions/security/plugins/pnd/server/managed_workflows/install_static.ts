/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { PND_WATCH_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

export { PND_WATCH_WORKFLOW_IDS };

export const installStatic = async ({
  enabled,
  workflowsExtensions,
  logger,
}: {
  enabled: boolean;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<{ failedIds: string[] }> => {
  if (!enabled) return { failedIds: [] };

  const client = await workflowsExtensions.initManagedWorkflowsClient('pnd');
  const failedIds: string[] = [];

  for (const id of PND_WATCH_WORKFLOW_IDS) {
    try {
      await client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    } catch (error) {
      failedIds.push(id);
      logger.error(
        `Failed to install managed PND watch workflow "${id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  await client.ready();
  return { failedIds };
};
