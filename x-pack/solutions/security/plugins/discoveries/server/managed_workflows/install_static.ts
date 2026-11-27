/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { Logger } from '@kbn/core/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

export const AD_WORKFLOW_IDS = [
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
] as const;

export const installStatic = async ({
  enabled,
  logger,
  workflowsExtensions,
}: {
  enabled: boolean;
  logger: Logger;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}): Promise<{ failedIds: string[] }> => {
  if (!enabled) return { failedIds: [] };

  const client = await workflowsExtensions.initManagedWorkflowsClient('discoveries');
  let failedIds: string[];
  try {
    const { failed } = await client.installMany(
      AD_WORKFLOW_IDS.map((id) => ({ id, spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
    );
    for (const { id, error } of failed) {
      logger.error(`discoveries: Failed to install managed workflow "${id}": ${error.message}`);
    }
    failedIds = failed.map(({ id }) => id);
  } catch (error) {
    logger.error(
      `discoveries: Failed to install managed workflows: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    failedIds = [...AD_WORKFLOW_IDS];
  }

  await client.ready();
  return { failedIds };
};
