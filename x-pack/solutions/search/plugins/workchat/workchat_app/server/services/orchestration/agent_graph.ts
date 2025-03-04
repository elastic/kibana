/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { AIMessageChunk } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { basePrompt } from './prompts';

/**
 *
 */
export const createAgentGraph = async ({
  agentId,
  chatModel,
}: {
  agentId: string;
  chatModel: InferenceChatModel;
}) => {
  const StateAnnotation = Annotation.Root({
    input: Annotation<string>,
    ...MessagesAnnotation.spec, // unused for now
    response: Annotation<AIMessageChunk>,
  });

  const model = chatModel.withConfig({
    tags: ['workflow', `agent:${agentId}`],
  });

  const callModel = async (state: typeof StateAnnotation.State) => {
    const response = await model.invoke(await basePrompt({ message: state.input }));
    return { response };
  };

  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addEdge('__start__', 'agent')
    .addEdge('agent', '__end__')
    .compile();

  return graph;
};
