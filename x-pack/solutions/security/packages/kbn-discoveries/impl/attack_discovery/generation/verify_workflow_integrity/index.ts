/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { DefaultWorkflowIds, WorkflowIntegrityResult } from '../types';

export interface VerifyWorkflowIntegrityResult {
  integrityResult: WorkflowIntegrityResult | null;
  updatedIds: DefaultWorkflowIds | null;
}

export const verifyWorkflowIntegrity = async ({
  checkIntegrity,
  defaultWorkflowIds,
  logger,
}: {
  checkIntegrity?: (() => Promise<WorkflowIntegrityResult>) | undefined;
  defaultWorkflowIds: DefaultWorkflowIds | null;
  logger: Logger;
}): Promise<VerifyWorkflowIntegrityResult> => {
  if (defaultWorkflowIds == null || checkIntegrity == null) {
    return { integrityResult: null, updatedIds: defaultWorkflowIds };
  }

  const result = await checkIntegrity();

  if (result.status === 'repair_failed') {
    const failedKeys = result.unrepairableErrors.map(({ key }) => key).join(', ');
    throw new Error(
      `Attack Discovery workflow integrity check failed: could not repair workflows [${failedKeys}]. ${result.unrepairableErrors
        .map(({ error, key, workflowId }) => `${key} (${workflowId}): ${error}`)
        .join('; ')}`
    );
  }

  for (const { error, key, workflowId } of result.optionalWarnings) {
    logger.warn(
      `Optional workflow '${workflowId}' (${key}) could not be repaired: ${error}. Generation continues.`
    );
  }

  const updatedIds: DefaultWorkflowIds = { ...defaultWorkflowIds };
  for (const { key, workflowId } of result.repaired) {
    updatedIds[key] = workflowId;
  }
  for (const { key, workflowId } of result.optionalRepaired) {
    updatedIds[key] = workflowId;
  }
  return { integrityResult: result, updatedIds };
};
