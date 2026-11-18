/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, serverUnavailable } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import type { GetWorkflowsManagement } from '../../routes/types';

/** Distinguishes a deleted workflow from permission and availability failures. */
export const isAutomationWorkflowMissing = async (
  workflowId: string | undefined,
  spaceId: string,
  request: KibanaRequest,
  getWorkflowsManagement: GetWorkflowsManagement
): Promise<boolean> => {
  if (!workflowId) return true;
  const workflows = getWorkflowsManagement();
  if (!workflows) throw serverUnavailable('Workflows management is not available');
  try {
    await workflows.management.assertWorkflowAccess(workflowId, spaceId, 'read', request);
    return false;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) return true;
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 403) {
      throw boomify(error, { statusCode: 403 });
    }
    throw error;
  }
};
