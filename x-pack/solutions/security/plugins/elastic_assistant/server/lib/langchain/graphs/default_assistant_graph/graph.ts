/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentRunnableSequence } from 'langchain/dist/agents/agent';
import { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/logging';

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Replacements } from '@kbn/elastic-assistant-common';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AgentState, NodeParamsBase } from './types';
import { AssistantDataClients } from '../../executors/types';

import { stepRouter } from './nodes/step_router';
import { modelInput } from './nodes/model_input';
import { runAgent } from './nodes/run_agent';
import { generateChatTitle } from './nodes/generate_chat_title';
import { getPersistedConversation } from './nodes/get_persisted_conversation';
import { persistConversationChanges } from './nodes/persist_conversation_changes';
import { respond } from './nodes/respond';
import { NodeType } from './constants';
import { getStateAnnotation } from './state';

export const DEFAULT_ASSISTANT_GRAPH_ID = 'Default Security Assistant Graph';

export interface GetDefaultAssistantGraphParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  agentRunnable: AgentRunnableSequence;
  dataClients?: AssistantDataClients;
  createLlmInstance: () => BaseChatModel;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  signal?: AbortSignal;
  tools: StructuredTool[];
  replacements: Replacements;
  getFormattedTime?: () => string;
}

export type DefaultAssistantGraph = ReturnType<typeof getDefaultAssistantGraph>;

export const getDefaultAssistantGraph = ({
  actionsClient,
  agentRunnable,
  dataClients,
  createLlmInstance,
  logger,
  savedObjectsClient,
  // some chat models (bedrock) require a signal to be passed on agent invoke rather than the signal passed to the chat model
  signal,
  tools,
  replacements,
  getFormattedTime,
}: GetDefaultAssistantGraphParams) => {
  try {
    // Default node parameters
    const nodeParams: NodeParamsBase = {
      actionsClient,
      logger,
      savedObjectsClient,
    };

    const stateAnnotation = getStateAnnotation({ getFormattedTime });

    const toolNodeForGraph = new ToolNode(tools);

    // Put together a new graph using default state from above
    const graph = new StateGraph(stateAnnotation)
      .addNode(NodeType.GET_PERSISTED_CONVERSATION, (state: AgentState) =>
        getPersistedConversation({
          ...nodeParams,
          state,
          conversationsDataClient: dataClients?.conversationsDataClient,
        })
      )
      .addNode(NodeType.GENERATE_CHAT_TITLE, (state: AgentState) =>
        generateChatTitle({ ...nodeParams, state, model: createLlmInstance() })
      )
      .addNode(NodeType.PERSIST_CONVERSATION_CHANGES, (state: AgentState) =>
        persistConversationChanges({
          ...nodeParams,
          state,
          conversationsDataClient: dataClients?.conversationsDataClient,
          replacements,
        })
      )
      .addNode(NodeType.AGENT, (state: AgentState) =>
        runAgent({
          ...nodeParams,
          config: { signal },
          state,
          agentRunnable,
          kbDataClient: dataClients?.kbDataClient,
        })
      )
      .addNode(NodeType.TOOLS, toolNodeForGraph)
      .addNode(NodeType.RESPOND, (state: AgentState) =>
        respond({ ...nodeParams, config: { signal }, state, model: createLlmInstance() })
      )
      .addNode(NodeType.MODEL_INPUT, (state: AgentState) => modelInput({ ...nodeParams, state }))
      .addEdge(START, NodeType.MODEL_INPUT)
      .addEdge(NodeType.RESPOND, END)
      .addEdge(NodeType.GENERATE_CHAT_TITLE, NodeType.PERSIST_CONVERSATION_CHANGES)
      .addEdge(NodeType.PERSIST_CONVERSATION_CHANGES, NodeType.AGENT)
      .addEdge(NodeType.TOOLS, NodeType.AGENT)
      .addConditionalEdges(NodeType.MODEL_INPUT, stepRouter, {
        [NodeType.GET_PERSISTED_CONVERSATION]: NodeType.GET_PERSISTED_CONVERSATION,
        [NodeType.AGENT]: NodeType.AGENT,
      })
      .addConditionalEdges(NodeType.GET_PERSISTED_CONVERSATION, stepRouter, {
        [NodeType.PERSIST_CONVERSATION_CHANGES]: NodeType.PERSIST_CONVERSATION_CHANGES,
        [NodeType.GENERATE_CHAT_TITLE]: NodeType.GENERATE_CHAT_TITLE,
      })
      .addConditionalEdges(NodeType.AGENT, stepRouter, {
        [NodeType.RESPOND]: NodeType.RESPOND,
        [NodeType.TOOLS]: NodeType.TOOLS,
        [NodeType.END]: END,
      });
    return graph.compile();
  } catch (e) {
    throw new Error(`Unable to compile DefaultAssistantGraph\n${e}`);
  }
};
