/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
} from '@kbn/langchain/server';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { getInspectIndexMappingTool } from '../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import { CheckIfIndexContainsRequiredFieldsAnnotation } from './state';
import { AGENT, RESPOND, TOOLS } from './constants';
import { agentStepRouter, startStepRouter } from './step_router';
import { getAgent } from './nodes/agent/agent';
import { getRespond } from './nodes/respond/respond';

export const getCheckIfIndexContainsRequiredFieldsForQueryGraph = ({
  esClient,
  createLlmInstance,
}: {
  esClient: ElasticsearchClient;
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const tools: StructuredToolInterface[] = [getInspectIndexMappingTool({ esClient })];
  const toolNode = new ToolNode(tools);

  const llm = createLlmInstance();
  const llmWithTools = llm.bindTools(tools);

  const graph = new StateGraph(CheckIfIndexContainsRequiredFieldsAnnotation)
    .addNode(AGENT, getAgent({ llm: llmWithTools }), { retryPolicy: { maxAttempts: 3 } })
    .addNode(RESPOND, getRespond({ createLlmInstance }), { retryPolicy: { maxAttempts: 3 } })
    .addNode(TOOLS, toolNode)
    .addEdge(TOOLS, AGENT)
    .addConditionalEdges(START, startStepRouter, {
      [AGENT]: AGENT,
      [TOOLS]: TOOLS,
    })
    .addConditionalEdges(AGENT, agentStepRouter, {
      [RESPOND]: RESPOND,
      [TOOLS]: TOOLS,
    })
    .addEdge(RESPOND, END)
    .compile();

  return graph;
};
