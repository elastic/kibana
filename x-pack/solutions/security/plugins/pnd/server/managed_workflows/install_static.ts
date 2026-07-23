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
  if (!enabled) {
    logger.warn('PND installStatic: enabled=false, skipping watch install');
    return { failedIds: [] };
  }

  logger.info(`PND installStatic: installing ${PND_WATCH_WORKFLOW_IDS.length} watch workflows`);
  const client = await workflowsExtensions.initManagedWorkflowsClient('pnd');
  logger.info('PND installStatic: got managed workflows client');
  const failedIds: string[] = [];

  for (const id of PND_WATCH_WORKFLOW_IDS) {
    try {
      logger.info(`PND installStatic: installing ${id}`);
      await client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
      logger.info(`PND installStatic: installed ${id} successfully`);
    } catch (error) {
      failedIds.push(id);
      logger.error(
        `Failed to install managed PND watch workflow "${id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  logger.info('PND installStatic: calling client.ready()');
  try {
    await client.ready();
    logger.info('PND installStatic: client.ready() completed');
  } catch (error) {
    logger.error(
      `PND installStatic: client.ready() failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return { failedIds };
};
