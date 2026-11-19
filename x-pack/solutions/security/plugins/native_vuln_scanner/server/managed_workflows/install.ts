/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NATIVE_VULN_SCANNER_WORKFLOW_IDS } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { MANAGED_WORKFLOW_OWNER_ID } from './register_owner';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Installs the scan workflow once, in the default space, so no other space re-downloads the same
 * feeds. It is installed disabled and never auto-enabled: an operator turns the schedule on.
 */
export const installWorkflows = async ({
  logger,
  workflowsExtensions,
}: {
  logger: Logger;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}): Promise<{ failedIds: string[] }> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(MANAGED_WORKFLOW_OWNER_ID);
  let failedIds: string[];
  try {
    const { failed } = await client.installMany(
      NATIVE_VULN_SCANNER_WORKFLOW_IDS.map((id) => ({ id, spaceId: DEFAULT_SPACE_ID }))
    );
    for (const { id, error } of failed) {
      logger.error(
        `nativeVulnScanner: Failed to install managed workflow "${id}": ${error.message}`
      );
    }
    failedIds = failed.map(({ id }) => id);
  } catch (error) {
    logger.error(`nativeVulnScanner: Failed to install managed workflows: ${errorMessage(error)}`);
    failedIds = [...NATIVE_VULN_SCANNER_WORKFLOW_IDS];
  }
  await client.ready();
  return { failedIds };
};
