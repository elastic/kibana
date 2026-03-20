/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  InitializationFlowId,
  InitializationFlowResult,
  InitializeSecuritySolutionResponse,
} from '../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_STATUS_ERROR,
  INITIALIZATION_FLOW_STATUS_READY,
  parseFlowPayload,
} from '../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from './types';
import { createListIndicesInitializationFlow } from './flows/create_list_indices';

// Each flow has a different ProvisionContext type, so `any` is needed to store
// them in a single map. Type safety is preserved inside each flow definition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flows: Partial<Record<InitializationFlowId, InitializationFlowDefinition<any>>> = {
  [INITIALIZATION_FLOW_CREATE_LIST_INDICES]: createListIndicesInitializationFlow,
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
    ): Promise<{ id: InitializationFlowId; result: InitializationFlowResult }> => {
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

        // Validate the payload against the registered zod schema for this flow.
        if (result.status === INITIALIZATION_FLOW_STATUS_READY) {
          result.payload = parseFlowPayload(flowId, result.payload);
        }

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
  }, {} as Record<InitializationFlowId, InitializationFlowResult>);

  return { flows: flowResults };
};
