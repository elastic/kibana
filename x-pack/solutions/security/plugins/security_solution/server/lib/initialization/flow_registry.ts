/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InitializationFlowId,
  InitializeSecuritySolutionResponse,
} from '../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_INIT_AI_PROMPTS,
  INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
  INITIALIZATION_FLOW_STATUS_ERROR,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../common/api/initialization';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from './types';
import { createListIndicesInitializationFlow } from './flows/create_list_indices';
import { initializeSecurityDataViewsFlow } from './flows/initialize_security_data_views';
import { initPrebuiltRulesFlow } from './flows/init_prebuilt_rules';
import { initEndpointProtectionFlow } from './flows/init_endpoint_protection';
import { initAiPromptsFlow } from './flows/init_ai_prompts';
import { initDetectionRuleMonitoringFlow } from './flows/init_detection_rule_monitoring';

// Each flow has a different TPayload type, so `any` is needed to store
// them in a single map. Type safety is preserved inside each flow definition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flows: Record<InitializationFlowId, InitializationFlowDefinition<any>> = {
  [INITIALIZATION_FLOW_CREATE_LIST_INDICES]: createListIndicesInitializationFlow,
  [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]: initializeSecurityDataViewsFlow,
  [INITIALIZATION_FLOW_INIT_PREBUILT_RULES]: initPrebuiltRulesFlow,
  [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]: initEndpointProtectionFlow,
  [INITIALIZATION_FLOW_INIT_AI_PROMPTS]: initAiPromptsFlow,
  [INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING]: initDetectionRuleMonitoringFlow,
};

interface FlowRunResult {
  id: InitializationFlowId;
  result: InitializationFlowResult<unknown>;
}

// Deduplicates concurrent server-side executions of the same flow.
// Space-aware flows use `flowId:spaceId` so they run independently per space.
// Non-space-aware flows use `flowId` only, deduplicating across all spaces.
const inflightFlows = new Map<string, Promise<FlowRunResult>>();

const runSingleFlow = async (
  flowId: InitializationFlowId,
  context: InitializationFlowContext
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
  let key: string = flowId;

  if (definition.spaceAware) {
    const spaceId = (await context.requestHandlerContext.securitySolution).getSpaceId();
    key = `${flowId}:${spaceId}`;
  }

  const inflight = inflightFlows.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = executeSingleFlow(definition, context);
  inflightFlows.set(key, promise);

  try {
    return await promise;
  } finally {
    inflightFlows.delete(key);
  }
};

const executeSingleFlow = async <TPayload>(
  definition: InitializationFlowDefinition<TPayload>,
  context: InitializationFlowContext
): Promise<FlowRunResult> => {
  const flowId = definition.id;
  try {
    const result = await definition.runFlow(context);

    return {
      id: flowId,
      result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    context.logger.error(`Initialization flow '${flowId}' failed: ${message}`);
    return {
      id: flowId,
      result: {
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: message,
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
  context: InitializationFlowContext
): Promise<InitializeSecuritySolutionResponse> => {
  const { logger } = context;
  const sequential = requestedFlows.filter((id) => flows[id]?.runFirst);
  const parallel = requestedFlows.filter((id) => !flows[id]?.runFirst);

  logger.debug(
    `Running ${requestedFlows.length} initialization flows — sequential: [${sequential.join(
      ', '
    )}], parallel: [${parallel.join(', ')}]`
  );

  // Run runFirst flows sequentially
  const sequentialResults: FlowRunResult[] = [];
  for (const flowId of sequential) {
    sequentialResults.push(await runSingleFlow(flowId, context));
  }

  // Then run remaining flows in parallel
  const parallelResults = await Promise.all(
    parallel.map((flowId) => runSingleFlow(flowId, context))
  );

  const allResults = [...sequentialResults, ...parallelResults];
  const succeededFlows = allResults
    .filter(({ result }) => result.status === INITIALIZATION_FLOW_STATUS_READY)
    .map(({ id }) => id);
  const failedFlows = allResults
    .filter(({ result }) => result.status !== INITIALIZATION_FLOW_STATUS_READY)
    .map(({ id }) => id);

  logger.debug(
    `Initialization flows completed — succeeded: [${succeededFlows.join(
      ', '
    )}], failed: [${failedFlows.join(', ')}]`
  );

  const flowResults = allResults.reduce((acc, { id, result }) => {
    acc[id] = result;
    return acc;
  }, {} as Record<InitializationFlowId, InitializationFlowResult<unknown>>);

  // Each flow's runtime routing ensures the correct result type per flow ID.
  // The static type cannot capture this, so we cast at the boundary.
  return { flows: flowResults } as unknown as InitializeSecuritySolutionResponse;
};
