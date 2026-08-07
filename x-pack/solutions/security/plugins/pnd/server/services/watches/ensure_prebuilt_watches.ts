/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  PREBUILT_WATCH_DEFINITIONS,
  type PrebuiltWatchId,
} from '../../prebuilt_watches/definitions';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

export interface EnsurePrebuiltWatchesResult {
  created: PrebuiltWatchId[];
  existing: PrebuiltWatchId[];
  failed: PrebuiltWatchId[];
}

/**
 * Creates the customer-owned watch starting points on first use. Existing
 * workflows are never reconciled or replaced: after creation the customer owns
 * the only copy.
 *
 * Workflow ids are global across spaces and soft-deleted ids remain occupied.
 * Both cases surface in logs and degrade to an empty/partial list for the
 * requesting space; this function deliberately does not invent replacement ids.
 */
export const ensurePrebuiltWatches = async ({
  management,
  spaceId,
  request,
  logger,
}: {
  management: WatchWorkflowsManagementClient;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<EnsurePrebuiltWatchesResult> => {
  const result: EnsurePrebuiltWatchesResult = { created: [], existing: [], failed: [] };

  for (const { id, yaml } of PREBUILT_WATCH_DEFINITIONS) {
    const existing = await management.getWorkflow(id, spaceId);
    if (existing) {
      result.existing.push(id);
      continue;
    }

    let created: WorkflowDetailDto;
    try {
      created = await management.createWorkflow({ id, yaml }, spaceId, request);
    } catch (error) {
      let concurrentlyCreated = null;
      try {
        concurrentlyCreated = await management.getWorkflow(id, spaceId);
      } catch {
        // Preserve the original create error below.
      }
      if (concurrentlyCreated) {
        result.existing.push(id);
        continue;
      }
      result.failed.push(id);
      logger.error(
        `Could not create customer-owned watch starting point "${id}" in space "${spaceId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }

    if (!created.enabled) {
      try {
        // createWorkflow currently ignores enabled: true in the YAML, so the
        // newly created workflow needs one ordinary update to schedule it.
        const enabled = await management.updateWorkflow(id, { enabled: true }, spaceId, request);
        if (!enabled.valid) {
          throw new Error(
            `Workflow was created but could not be enabled: ${enabled.validationErrors.join('; ')}`
          );
        }
      } catch (error) {
        result.failed.push(id);
        logger.error(
          `Created customer-owned watch starting point "${id}" but could not enable it: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        continue;
      }
    }
    result.created.push(id);
    logger.info(`Created customer-owned watch starting point "${id}"`);
  }

  return result;
};
