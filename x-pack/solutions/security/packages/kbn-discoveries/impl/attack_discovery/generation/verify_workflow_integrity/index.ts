/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, KibanaRequest, Logger } from '@kbn/core/server';

import { reportMisconfiguration } from '../../../lib/telemetry/report_misconfiguration';
import type {
  DefaultWorkflowIds,
  WorkflowInitializationService,
  WorkflowIntegrityResult,
} from '../types';

export interface VerifyWorkflowIntegrityResult {
  integrityResult: WorkflowIntegrityResult | null;
  updatedIds: DefaultWorkflowIds | null;
}

export const verifyWorkflowIntegrity = async ({
  analytics,
  defaultWorkflowIds,
  logger,
  request,
  spaceId,
  workflowInitService,
}: {
  analytics?: AnalyticsServiceSetup;
  defaultWorkflowIds: DefaultWorkflowIds | null;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  workflowInitService?: WorkflowInitializationService;
}): Promise<VerifyWorkflowIntegrityResult> => {
  if (defaultWorkflowIds == null || workflowInitService == null) {
    return { integrityResult: null, updatedIds: defaultWorkflowIds };
  }

  const result = await workflowInitService.verifyAndRepairWorkflows({
    defaultWorkflowIds,
    logger,
    request,
    spaceId,
  });

  if (result.status === 'repair_failed') {
    const failedKeys = result.unrepairableErrors.map(({ key }) => key).join(', ');
    throw new Error(
      `Attack Discovery workflow integrity check failed: could not repair workflows [${failedKeys}]. ${result.unrepairableErrors
        .map(({ error, key, workflowId }) => `${key} (${workflowId}): ${error}`)
        .join('; ')}`
    );
  }

  if (analytics != null) {
    for (const { key, workflowId } of result.repaired) {
      reportMisconfiguration({
        analytics,
        logger,
        params: {
          detail: `Workflow '${key}' was modified and has been automatically restored`,
          misconfiguration_type: 'workflow_modified',
          space_id: spaceId,
          workflow_id: workflowId,
        },
      });
    }

    for (const { key, workflowId } of result.optionalRepaired) {
      reportMisconfiguration({
        analytics,
        logger,
        params: {
          detail: `Optional workflow '${key}' was modified and has been automatically restored`,
          misconfiguration_type: 'workflow_modified',
          space_id: spaceId,
          workflow_id: workflowId,
        },
      });
    }
  }

  for (const { error, key, workflowId } of result.optionalWarnings) {
    logger.warn(
      `Optional workflow '${workflowId}' (${key}) could not be repaired: ${error}. Generation continues.`
    );
  }

  // Merge any repaired workflow IDs into the returned DefaultWorkflowIds so the
  // caller always uses up-to-date IDs (even for the current request).
  const updatedIds: DefaultWorkflowIds = { ...defaultWorkflowIds };
  for (const { key, workflowId } of result.repaired) {
    updatedIds[key] = workflowId;
  }
  for (const { key, workflowId } of result.optionalRepaired) {
    updatedIds[key] = workflowId;
  }
  return { integrityResult: result, updatedIds };
};
