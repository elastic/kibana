/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { StructuredTool } from '@langchain/core/tools';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { withSystemPrompt } from './prompts';
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
    initialMessages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
    addedMessages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
  });

  const tools = [...integrationTools];

  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['workflow', `agent:${agentId}`],
  });

  const callModel = async (state: typeof StateAnnotation.State) => {
    const response = await model.invoke(
      await withSystemPrompt({ messages: [...state.initialMessages, ...state.addedMessages] })
    );
    return {
      addedMessages: [response],
    };
  };

  const shouldContinue = async (state: typeof StateAnnotation.State) => {
    const messages = state.addedMessages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: typeof StateAnnotation.State) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);
    return {
      addedMessages: [...state.addedMessages, ...toolNodeResult],
    };
  };

  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addEdge('__start__', 'agent')
    .addNode('tools', toolHandler)
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .compile();

  return graph;
};
