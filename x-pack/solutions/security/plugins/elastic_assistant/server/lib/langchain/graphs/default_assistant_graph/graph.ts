/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/logging';

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { AgentState, NodeParamsBase } from './types';

import { stepRouter } from './nodes/step_router';
import { runAgent } from './nodes/run_agent';
import { NodeType } from './constants';
import { AssistantStateAnnotation } from './state';

export const DEFAULT_ASSISTANT_GRAPH_ID = 'Default Security Assistant Graph';

export interface GetDefaultAssistantGraphParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  createLlmInstance: () => Promise<BaseChatModel>;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  signal?: AbortSignal;
  tools: StructuredTool[];
  contentReferencesStore: ContentReferencesStore;
  checkpointSaver: BaseCheckpointSaver | null;
}

export type DefaultAssistantGraph = Awaited<ReturnType<typeof getDefaultAssistantGraph>>;

export const getDefaultAssistantGraph = async ({
  actionsClient,
  checkpointSaver,
  contentReferencesStore,
  createLlmInstance,
  logger,
  savedObjectsClient,
  // some chat models (bedrock) require a signal to be passed on agent invoke rather than the signal passed to the chat model
  signal,
  tools,
}: GetDefaultAssistantGraphParams) => {
  try {
    // Default node parameters
    const nodeParams: NodeParamsBase = {
      actionsClient,
      logger,
      savedObjectsClient,
      contentReferencesStore,
    };

    const stateAnnotation = AssistantStateAnnotation;
    const llm = await createLlmInstance();
    if (!llm.bindTools) {
      throw new Error('Llm instance does not support bindTools method');
    }
    const llmWithTools = llm.bindTools(tools);
    const toolNode = new ToolNode(tools);

    // Put together a new graph using default state from above
    const graph = new StateGraph(stateAnnotation)
      .addNode(NodeType.AGENT, (state: AgentState) =>
        runAgent({
          ...nodeParams,
          config: { signal },
          state,
          model: llmWithTools,
        })
      )
      .addNode(NodeType.TOOLS, toolNode)
      .addEdge(START, NodeType.AGENT)
      .addEdge(NodeType.TOOLS, NodeType.AGENT)
      .addConditionalEdges(NodeType.AGENT, stepRouter, {
        [NodeType.TOOLS]: NodeType.TOOLS,
        [NodeType.END]: END,
      });
    return graph.compile({
      ...(checkpointSaver !== null ? { checkpointer: checkpointSaver } : {}),
    });
  } catch (e) {
    throw new Error(`Unable to compile DefaultAssistantGraph\n${e}`);
  }
};
