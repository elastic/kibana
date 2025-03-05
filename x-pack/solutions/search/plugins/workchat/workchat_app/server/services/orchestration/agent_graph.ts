/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { basePrompt } from './prompts';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { StructuredTool } from '@langchain/core/tools';
export const createAgentGraph = async ({
  agentId,
  chatModel,
  integrationTools,
}: {
  agentId: string;
  chatModel: InferenceChatModel;
  integrationTools: StructuredTool[];
}) => {
  const StateAnnotation = Annotation.Root({
    input: Annotation<string>,
    ...MessagesAnnotation.spec, // unused for now
    response: Annotation<AIMessageChunk>,
  });

  const tools = [...integrationTools];

  const toolNode = new ToolNode<typeof StateAnnotation.State>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['workflow', `agent:${agentId}`],
  });

  const callModel = async (state: typeof StateAnnotation.State) => {
    const response = await model.invoke(await basePrompt({ message: state.input }));
    return {
      messages: [response],
    }
  };

  const shouldContinue = async (state: typeof StateAnnotation.State) => {
    const messages = state.messages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  };

  const graph = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addEdge("__start__", "agent")
    .addNode("tools", toolNode)
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .compile();

  return graph;
};
