/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { type Tool, tool as toTool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { KibanaRequest } from '@kbn/core/server';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import { getElasticsearchPrompt } from './prompts';
import { progressMessages } from './i18n';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { OpenAPIToolSet } from '../../utils/openapi_tool_set';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  query: Annotation<string>(),
  // inner
  toolsValid: Annotation<boolean>(),
  tools: Annotation<Tool[]>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // outputs
  error: Annotation<string>(),
  results: Annotation<{ content: unknown }[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

export const createElasticsearchToolGraph = async ({
  core,
  modelProvider,
  esClient,
  events,
  request,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  events: ToolEventEmitter;
  request: KibanaRequest;
}) => {
  // TODO make this configurable, we need a platform level setting for the embedding model
  const inferenceId = defaultInferenceEndpoints.ELSER;
  // Create a closure that will resolve llmTasks when the handler is called
  const getLlmTasks = async () => {
    const [, plugins] = await core.getStartServices();
    return plugins.llmTasks;
  };
  const model = await modelProvider.getDefaultModel();

  const generateTools = async (state: StateType) => {
    events?.reportProgress(progressMessages.generatingTools());
    const llmTasks = await getLlmTasks();
    if (!llmTasks) {
      return {
        toolsValid: false,
        error: 'LLM Tasks plugin is not available',
      };
    }
    const connector = model.connector;
    // Retrieve documentation
    const result = await llmTasks.retrieveDocumentation({
      searchTerm: state.query,
      products: ['elasticsearch'],
      resourceTypes: ['openapi_spec'],
      max: 5,
      connectorId: connector.connectorId,
      request,
      inferenceId,
    });

    const openapiSpecs = result.documents.map((doc) => JSON.parse(doc.content));

    const openApiToolSet = new OpenAPIToolSet({ operations: openapiSpecs });

    const tools = openApiToolSet.getTools();

    // TODO: validate tools
    if (tools.length > 0) {
      return {
        toolsValid: true,
        tools: tools.map((tool) =>
          toTool(async (args) => tool.handler(args, esClient), {
            name: tool.name,
            description: tool.description,
            schema: tool.schema,
          })
        ),
      };
    } else {
      return {
        toolsValid: false,
        error: `Could not dynamically generate tools`,
      };
    }
  };

  const terminateIfInvalidTools = async (state: StateType) => {
    return state.toolsValid ? 'agent' : '__end__';
  };

  const callElasticsearchAgent = async (state: StateType) => {
    events?.reportProgress(progressMessages.callingElasticsearchAgent());
    const searchModel = model.chatModel.bindTools(state.tools).withConfig({
      tags: ['observability-elasticsearch-tool'],
    });
    const response = await searchModel.invoke(
      getElasticsearchPrompt({ nlQuery: state.nlQuery, tools: state.tools })
    );
    return {
      messages: [response],
    };
  };

  const decideContinueOrEnd = async (state: StateType) => {
    // only one call for now
    return '__end__';
  };

  const executeTool = async (state: StateType) => {
    events?.reportProgress(progressMessages.performingElasticsearchTool());
    const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(state.tools);
    const toolNodeResult = await toolNode.invoke(state.messages);
    const toolMessage = toolNodeResult[toolNodeResult.length - 1];
    return {
      results: [
        {
          name: toolMessage.name!,
          content: JSON.parse(toolMessage.content as string),
        },
      ],
    };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('generate_tools', generateTools)
    .addNode('agent', callElasticsearchAgent)
    .addNode('execute_tool', executeTool)
    // edges
    .addEdge('__start__', 'generate_tools')
    .addConditionalEdges('generate_tools', terminateIfInvalidTools, {
      agent: 'agent',
      __end__: '__end__',
    })
    .addEdge('agent', 'execute_tool')
    .addConditionalEdges('execute_tool', decideContinueOrEnd, {
      agent: 'agent',
      __end__: '__end__',
    })
    .compile();

  return graph;
};
