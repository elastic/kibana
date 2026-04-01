/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

// Placeholder — real implementation added in PR 9
export interface WorkflowInitializationService {
  ensureWorkflowsForSpace(params: {
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<Record<string, string> | null>;

  verifyAndRepairWorkflows(params: {
    defaultWorkflowIds: Record<string, string>;
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<unknown>;
}
