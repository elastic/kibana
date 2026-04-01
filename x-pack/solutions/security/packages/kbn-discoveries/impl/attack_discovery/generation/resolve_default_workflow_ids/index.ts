/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

import type { DefaultWorkflowIds, WorkflowInitializationService } from '../types';

export const resolveDefaultWorkflowIds = async ({
  logger,
  request,
  spaceId,
  workflowInitService,
}: {
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  workflowInitService?: WorkflowInitializationService;
}): Promise<DefaultWorkflowIds | null> => {
  if (workflowInitService == null) {
    return null;
  }

  return workflowInitService.ensureWorkflowsForSpace({ logger, request, spaceId });
};
