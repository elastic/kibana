/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializeSecuritySolutionResponse,
  InitializationFlowErrorResult,
  CreateListIndicesReadyResult,
  SecurityDataViewsReadyResult,
} from '../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../common/api/initialization';

type FlowResult =
  | CreateListIndicesReadyResult
  | SecurityDataViewsReadyResult
  | InitializationFlowErrorResult;
import type { InitializationFlowContext, InitializationFlowDefinition } from './types';
import { createListIndicesInitializationFlow } from './flows/create_list_indices';
import { initializeSecurityDataViewsFlow } from './flows/initialize_security_data_views';

// Each flow has a different ProvisionContext type, so `any` is needed to store
// them in a single map. Type safety is preserved inside each flow definition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flows: Record<InitializationFlowId, InitializationFlowDefinition<any>> = {
  [INITIALIZATION_FLOW_CREATE_LIST_INDICES]: createListIndicesInitializationFlow,
  [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]: initializeSecurityDataViewsFlow,
};

export class FlowInitializationError extends Error {}

/**
 * Runs the requested initialization flows in parallel and returns the results.
 */
export const runInitializationFlows = async (
  requestedFlows: InitializationFlowId[],
  context: InitializationFlowContext,
  logger: Logger
): Promise<InitializeSecuritySolutionResponse> => {
  const promises = requestedFlows.map(
    async (
      flowId: InitializationFlowId
    ): Promise<{ id: InitializationFlowId; result: FlowResult }> => {
      const definition = flows[flowId];

      if (!definition) {
        return {
          id: flowId,
          result: {
            status: INITIALIZATION_FLOW_STATUS_ERROR,
            error: `Initialization flow '${flowId}' is not registered`,
          },
        };
      }

      try {
        const provisionContext = await definition.resolveProvisionContext(context, logger);
        const result = await definition.provision(provisionContext, logger);

        return {
          id: flowId,
          result,
        };
      } catch (err) {
        logger.error(`Initialization flow '${flowId}' failed: ${err.message}`);
        const errMessage =
          err instanceof FlowInitializationError
            ? err.message
            : 'internal initialization flow error';
        return {
          id: flowId,
          result: {
            status: INITIALIZATION_FLOW_STATUS_ERROR,
            error: errMessage,
          },
        };
      }
    }
  );

  const results = await Promise.all(promises);
  const flowResults = results.reduce((acc, { id, result }) => {
    acc[id] = result;
    return acc;
  }, {} as Record<InitializationFlowId, FlowResult>);

  // Each flow's runtime routing ensures the correct result type per flow ID.
  // The static type cannot capture this, so we cast at the boundary.
  return { flows: flowResults } as unknown as InitializeSecuritySolutionResponse;
};
