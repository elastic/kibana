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
  workflowsExtensions,
}: {
  enabled: boolean;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}): Promise<{ failedIds: string[] }> => {
  if (!enabled) return { failedIds: [] };

  const client = await workflowsExtensions.initManagedWorkflowsClient('discoveries');
  const failedIds: string[] = [];

  for (const id of AD_WORKFLOW_IDS) {
    try {
      await client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    } catch {
      failedIds.push(id);
    }
  }

  await client.ready();
  return { failedIds };
};
