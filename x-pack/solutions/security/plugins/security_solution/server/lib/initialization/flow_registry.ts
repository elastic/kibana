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
  PackageInstallReadyResult,
  SecurityDataViewsReadyResult,
} from '../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE,
  INITIALIZATION_FLOW_INSTALL_ENDPOINT_PACKAGE,
  INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../common/api/initialization';

type FlowResult =
  | CreateListIndicesReadyResult
  | SecurityDataViewsReadyResult
  | PackageInstallReadyResult
  | InitializationFlowErrorResult;
import type { InitializationFlowContext, InitializationFlowDefinition } from './types';
import { createListIndicesInitializationFlow } from './flows/create_list_indices';
import { initializeSecurityDataViewsFlow } from './flows/initialize_security_data_views';
import { installPrebuiltRulesPackageFlow } from './flows/install_prebuilt_rules_package';
import { installEndpointPackageFlow } from './flows/install_endpoint_package';
import { installAiPromptsPackageFlow } from './flows/install_ai_prompts_package';

// Each flow has a different ProvisionContext type, so `any` is needed to store
// them in a single map. Type safety is preserved inside each flow definition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flows: Record<InitializationFlowId, InitializationFlowDefinition<any>> = {
  [INITIALIZATION_FLOW_CREATE_LIST_INDICES]: createListIndicesInitializationFlow,
  [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]: initializeSecurityDataViewsFlow,
  [INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE]: installPrebuiltRulesPackageFlow,
  [INITIALIZATION_FLOW_INSTALL_ENDPOINT_PACKAGE]: installEndpointPackageFlow,
  [INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE]: installAiPromptsPackageFlow,
};

export class FlowInitializationError extends Error {}

type FlowRunResult = { id: InitializationFlowId; result: FlowResult };

// Deduplicates concurrent server-side executions of the same flow within the
// same space. The key is `flowId:spaceId` so flows running in different spaces
// execute independently.
const inflightFlows = new Map<string, Promise<FlowRunResult>>();

const runSingleFlow = async (
  flowId: InitializationFlowId,
  context: InitializationFlowContext,
  logger: Logger
): Promise<FlowRunResult> => {
  const spaceId = (await context.requestHandlerContext.securitySolution).getSpaceId();
  const key = `${flowId}:${spaceId}`;

  const inflight = inflightFlows.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = executeSingleFlow(flowId, context, logger);
  inflightFlows.set(key, promise);

  try {
    return await promise;
  } finally {
    inflightFlows.delete(key);
  }
};

const executeSingleFlow = async (
  flowId: InitializationFlowId,
  context: InitializationFlowContext,
  logger: Logger
): Promise<FlowRunResult> => {
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
};

/**
 * Runs the requested initialization flows and returns the results.
 *
 * Flows marked with `runFirst: true` run sequentially before the remaining
 * flows, which execute in parallel.
 */
export const runInitializationFlows = async (
  requestedFlows: InitializationFlowId[],
  context: InitializationFlowContext,
  logger: Logger
): Promise<InitializeSecuritySolutionResponse> => {
  const sequential = requestedFlows.filter((id) => flows[id]?.runFirst);
  const parallel = requestedFlows.filter((id) => !flows[id]?.runFirst);

  // Run runFirst flows sequentially
  const sequentialResults: Array<{ id: InitializationFlowId; result: FlowResult }> = [];
  for (const flowId of sequential) {
    sequentialResults.push(await runSingleFlow(flowId, context, logger));
  }

  // Then run remaining flows in parallel
  const parallelResults = await Promise.all(
    parallel.map((flowId) => runSingleFlow(flowId, context, logger))
  );

  const allResults = [...sequentialResults, ...parallelResults];
  const flowResults = allResults.reduce((acc, { id, result }) => {
    acc[id] = result;
    return acc;
  }, {} as Record<InitializationFlowId, FlowResult>);

  // Each flow's runtime routing ensures the correct result type per flow ID.
  // The static type cannot capture this, so we cast at the boundary.
  return { flows: flowResults } as unknown as InitializeSecuritySolutionResponse;
};
