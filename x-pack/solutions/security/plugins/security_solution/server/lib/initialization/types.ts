/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowResult,
} from '../../../common/api/initialization';
import type { SecuritySolutionRequestHandlerContext } from '../../types';

export interface InitializationFlowContext {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  spaceId: string;
  logger: Logger;
  /**
   * The request handler context is available only when the flow is triggered
   * from an HTTP request (i.e. not from a task). Flows should prefer
   * `esClient` / `soClient` / `spaceId` and only fall back to this for
   * accessing plugin-specific request-scoped services.
   */
  requestHandlerContext?: SecuritySolutionRequestHandlerContext;
}

export interface InitializationFlowDefinition {
  id: InitializationFlowId;
  dependencies?: InitializationFlowId[];
  provision: (context: InitializationFlowContext) => Promise<InitializationFlowResult>;
}
