/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowReadyResult,
  InitializationFlowErrorResult,
} from '../../../common/api/initialization';
import type { SecuritySolutionRequestHandlerContext } from '../../types';

export interface InitializationFlowContext {
  requestHandlerContext: SecuritySolutionRequestHandlerContext;
}

export interface InitializationFlowDefinition<ProvisionContext> {
  id: InitializationFlowId;
  resolveProvisionContext: (
    requestHandlerContext: InitializationFlowContext,
    logger: Logger
  ) => Promise<ProvisionContext>;
  provision: (
    context: ProvisionContext,
    logger: Logger
  ) => Promise<InitializationFlowReadyResult | InitializationFlowErrorResult>;
}
