/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ToolHandlerContext, ToolHandlerResult } from '@kbn/onechat-server';
import { type Tool, tool as toTool } from '@langchain/core/tools';
import { ToolResultType } from '@kbn/onechat-common';
import { getElasticsearchPrompt } from './prompts';
import { progressMessages } from './i18n';
import { OpenAPIToolSet } from '../../utils/openapi_tool_set';
import { searchElasticsearchApiDocs } from './search_elasticsearch_api_docs';

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
  results: Annotation<ToolHandlerResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

export const createElasticsearchToolGraph = async (toolHandlerContext: ToolHandlerContext) => {
  const { modelProvider, esClient, events } = toolHandlerContext;
  const model = await modelProvider.getDefaultModel();

  const generateTools = async (state: StateType) => {
    events?.reportProgress(progressMessages.generatingTools());
    const esApiDocs = await searchElasticsearchApiDocs(state.query, esClient);

    const openApiToolSet = new OpenAPIToolSet({ operations: esApiDocs });

    const tools = openApiToolSet.getTools();

    // TODO: validate tools
    if (tools.length > 0) {
      return {
        toolsValid: true,
        tools: tools.map((tool) =>
          toTool(async (args) => tool.handler(args, toolHandlerContext), {
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
          type: ToolResultType.other,
          data: {
            ...toolMessage,
            content: JSON.parse(toolMessage.content as string),
          },
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
