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
}): Promise<void> => {
  if (!enabled) return;

  const client = await workflowsExtensions.initManagedWorkflowsClient('pnd');

  const results = await Promise.allSettled(
    PND_WATCH_WORKFLOW_IDS.map((id) => client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
  );
  const failedIds = results.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      return [];
    }
    const id = PND_WATCH_WORKFLOW_IDS[index];
    logger.error(
      `Failed to install managed PND watch workflow "${id}": ${
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      }`
    );
    return [id];
  });

  if (failedIds.length > 0) {
    throw new Error(`Managed PND watch installation failed for: ${failedIds.join(', ')}`);
  }

  // Reconcile only after the complete owner set is installed. Calling ready()
  // after a partial install can prune previously installed workflows as orphans.
  await client.ready();
  logger.info('PND managed watch workflows installed');
};
