/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { ToolExecutor } from '@langchain/langgraph/prebuilt';
import { castArray } from 'lodash';
import { AgentAction } from 'langchain/agents';
import { TelemetryParams } from '@kbn/langchain/server/tracers/telemetry/telemetry_tracer';
import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { v4 as uuidv4 } from 'uuid';
import { getActionTypeId } from '../../../../../routes/utils';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../../../telemetry/event_based_telemetry';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';
import { ToolExecutionMetadataStore } from '../../../../tool_execution_metadata_store';

export interface ExecuteToolsParams extends NodeParamsBase {
  state: AgentState;
  tools: StructuredTool[];
  config?: RunnableConfig;
  telemetryParams?: TelemetryParams;
  telemetry: AnalyticsServiceSetup;
  metadataStore?: ToolExecutionMetadataStore;
}

/**
 * Node to execute tools
 *
 * Note: Could maybe leverage `ToolNode` if tool selection state is pushed to `messages[]`.
 * See: https://github.com/langchain-ai/langgraphjs/blob/0ef76d603b55c00a04f5793d1e6ab15af7c756cb/langgraph/src/prebuilt/tool_node.ts
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 * @param tools - The tools available to execute
 * @param config - Any configuration that may've been supplied
 */
export async function executeTools({
  logger,
  state,
  tools,
  config,
  telemetryParams,
  telemetry,
  metadataStore,
}: ExecuteToolsParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.TOOLS}: Node state:\n${JSON.stringify(state, null, 2)}`);

  const toolExecutor = new ToolExecutor({ tools });

  const steps = await Promise.all(
    castArray(state.agentOutcome as AgentAction)?.map(async (action) => {
      let out;

      try {
        out = await toolExecutor.invoke(action, config);
        console.log(`--@@executeTools toolCallId`, action.toolCallId);
        console.log(`--@@executeTools action.tool.id`, JSON.stringify(action.tool.id));

        const toolExecutionId = action.toolCallId ?? uuidv4();

        // Store tool execution metadata if metadataStore is available
        if (metadataStore) {
          console.log(`--@@executeTools action`, JSON.stringify(action));

          const metadata = {
            toolExecutionId,
            toolId: action.tool,
            toolName: action.tool,
            arguments: typeof action.toolInput === 'string' ? { input: action.toolInput } : action.toolInput,
            result: out.content,
            timestamp: Date.now(),
            conversationId: state.conversationId,
            connectorId: state.connectorId,
          };
          //@TODO: remove
          console.log(`--@@executeTools action.tool`, JSON.stringify(action.tool));
          metadataStore.storeMetadata(metadata);
        }
      } catch (err) {
        telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
          actionTypeId: telemetryParams?.actionTypeId ?? getActionTypeId(state.llmType),
          model: telemetryParams?.model,
          errorMessage: err.message ?? err.toString(),
          assistantStreamingEnabled: telemetryParams?.assistantStreamingEnabled ?? state.isStream,
          isEnabledKnowledgeBase: telemetryParams?.isEnabledKnowledgeBase ?? false,
          errorLocation: `executeTools-${action.tool}`,
        });

        // Store error metadata if metadataStore is available
        if (metadataStore) {
          const metadata = {
            toolExecutionId,
            toolId: action.tool,
            toolName: action.tool,
            arguments: typeof action.toolInput === 'string' ? { input: action.toolInput } : action.toolInput,
            result: { error: err.message || err.toString() },
            timestamp: Date.now(),
            conversationId: state.conversationId,
            connectorId: state.connectorId,
          };
          metadataStore.storeMetadata(metadata);
        }

        return {
          action,
          observation: JSON.stringify(`Error: ${err}`, null, 2),
        };
      }

      return {
        action,
        observation: JSON.stringify(out, null, 2),
      };
    })
  );

  return { steps, lastNode: NodeType.TOOLS };
}
