/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowErrorResult,
} from '../../../common/api/initialization';
import type { SecuritySolutionRequestHandlerContext } from '../../types';

export interface InitializationFlowContext {
  requestHandlerContext: SecuritySolutionRequestHandlerContext;
  logger: Logger;
}

export type InitializationFlowResult<TPayload> =
  | { status: 'ready'; payload: TPayload }
  | InitializationFlowErrorResult;

export interface InitializationFlowDefinition<TPayload> {
  id: InitializationFlowId;
  spaceAware?: boolean;
  /**
   * When true, this flow is executed sequentially and must complete before any
   * non-priority flows start in parallel. Multiple priority flows
   * are also executed one at a time, in the order they appear in the request.
   */
  runFirst?: boolean;
  runFlow(context: InitializationFlowContext): Promise<InitializationFlowResult<TPayload>>;
}
