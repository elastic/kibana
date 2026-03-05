/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation, messagesStateReducer } from '@langchain/langgraph';
import { type Tool, tool as toTool } from '@langchain/core/tools';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { KibanaRequest } from '@kbn/core/server';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents';
import type { ToolHandlerPromptReturn } from '@kbn/agent-builder-server/tools';
import {
  createErrorResult,
  type ModelProvider,
  type ToolEventEmitter,
  type ToolPromptManager,
  type ToolStateManager,
} from '@kbn/agent-builder-server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import { getElasticsearchPrompt } from './prompts';
import { progressMessages } from './i18n';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { OpenAPIToolSet } from '../../utils/openapi_tool_set';

/**
 * Truncates a JSON response to fit within a size budget (in characters).
 * Keeps the first N items of arrays and fields of objects until size limit is reached.
 * Adds _truncation_info markers to indicate what was removed.
 */
const truncateJsonResponse = (obj: unknown, maxSize: number = 6000): unknown => {
  const processValue = (
    value: unknown,
    remainingBudget: number
  ): { value: unknown; size: number } => {
    // Primitives: return as-is
    if (value === null || typeof value !== 'object') {
      const str = JSON.stringify(value);
      return { value, size: str.length };
    }

    // Arrays: keep first N items, add truncation info if needed
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      let size = 0;

      for (let i = 0; i < value.length; i++) {
        if (size > remainingBudget * 0.75) {
          // Size limit approaching, add truncation marker and stop
          if (i < value.length) {
            result.push({
              _truncation_info: {
                type: 'array',
                shown: result.length,
                total: value.length,
                remaining: value.length - result.length,
              },
            });
          }
          break;
        }

        const { value: processedItem, size: itemSize } = processValue(
          value[i],
          remainingBudget - size
        );
        result.push(processedItem);
        size += itemSize;
      }

      return { value: result, size };
    }

    // Objects: keep fields until size limit is reached
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>);
    let size = 0;
    let fieldsProcessed = 0;

    for (const [key, val] of entries) {
      if (size > remainingBudget) {
        // Size limit approaching, add truncation marker and stop
        const remainingFields = entries.length - fieldsProcessed;
        if (remainingFields > 0) {
          result._truncation_info = {
            type: 'object',
            fields_shown: fieldsProcessed,
            fields_total: entries.length,
            fields_remaining: remainingFields,
          };
        }
        break;
      }

      const { value: processedVal, size: valSize } = processValue(val, remainingBudget - size);
      result[key] = processedVal;
      size += key.length + valSize;
      fieldsProcessed++;
    }

    return { value: result, size };
  };

  const { value } = processValue(obj, maxSize);
  return value;
};

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  // inner
  toolsValid: Annotation<boolean>(),
  tools: Annotation<Tool[]>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  state: Annotation<unknown>(),
  openApiToolSet: Annotation<OpenAPIToolSet>(),
  // outputs
  error: Annotation<string>(),
  results: Annotation<{ content: unknown }[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  prompt: Annotation<ToolHandlerPromptReturn>(),
});

export type StateType = typeof StateAnnotation.State;

export const createElasticsearchToolGraph = async ({
  core,
  modelProvider,
  esClient,
  events,
  request,
  prompts,
  stateManager,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  events: ToolEventEmitter;
  request: KibanaRequest;
  prompts: ToolPromptManager;
  stateManager: ToolStateManager;
}) => {
  // TODO make this configurable, we need a platform level setting for the embedding model
  const inferenceId = defaultInferenceEndpoints.ELSER;

  const checkState = async (state: StateType) => {
    // retrieve the tool's execution state - present only if the execution was resumed
    const resumedState = stateManager.getState<StateType>();
    return !resumedState ? 'generate_tools' : 'check_confirmation';
  };

  const checkConfirmation = async (state: StateType) => {
    const resumedState = stateManager.getState<StateType>();
    const { status: confirmStatus } = prompts.checkConfirmationStatus('execute_action');
    if (confirmStatus === ConfirmationStatus.rejected) {
      return {
        results: [createErrorResult(`User denied usage of the action`)],
      };
    }
    return {
      ...resumedState,
    };
  };

  const decideContinue = async (state: StateType) => {
    const { status: confirmStatus } = prompts.checkConfirmationStatus('execute_action');
    if (confirmStatus === ConfirmationStatus.rejected) {
      return '__end__';
    }
    return 'execute_tool';
  };

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
      searchTerm: state.nlQuery,
      products: ['elasticsearch'],
      resourceTypes: ['openapi_spec'],
      max: 5,
      connectorId: connector.connectorId,
      request,
      inferenceId,
      tokenReductionStrategy: 'none', // we want the full spec to generate tools, we will truncate the response from the tools if needed
    });

    const openapiSpecs = result.documents.map((doc) => JSON.parse(doc.content));

    const openApiToolSet = new OpenAPIToolSet({ operations: openapiSpecs });

    const tools = openApiToolSet.getTools();

    // TODO: validate tools
    if (tools.length > 0) {
      return {
        toolsValid: true,
        openApiToolSet,
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

  const askForConfirmation = async (state: StateType) => {
    if (state.prompt) {
      stateManager.setState({ state });
      return '__end__';
    }
    return 'execute_tool';
  };

  const buildConfirmationMessage = (commands: string[]): string => {
    return `Are you sure you want to call these Elasticsearch APIs?\n\n${commands.join('\n')}`;
  };

  const isDangerousOperation = (
    response: AIMessageChunk,
    openApiToolSet: OpenAPIToolSet
  ): boolean => {
    if (response.tool_calls && response.tool_calls.length > 0) {
      const operations = response.tool_calls.map((t) => openApiToolSet.getToolOperation(t.name));
      const methods = operations.map((op) => op?.method.toLowerCase());
      if (methods.includes('post') || methods.includes('put') || methods.includes('delete')) {
        return true;
      }
    }
    return false;
  };

  const callElasticsearchAgent = async (state: StateType) => {
    events?.reportProgress(progressMessages.callingElasticsearchAgent());
    const searchModel = model.chatModel.bindTools(state.tools).withConfig({
      tags: ['observability-elasticsearch-tool'],
    });
    const response = await searchModel.invoke(
      getElasticsearchPrompt({ nlQuery: state.nlQuery, tools: state.tools })
    );
    if (response.tool_calls && isDangerousOperation(response, state.openApiToolSet)) {
      const commands = response.tool_calls.map((t) =>
        state.openApiToolSet.getApiCallConsoleCommand(t.name, t.args)
      );
      const confirmationMessage = buildConfirmationMessage(commands);
      const confirmation = await prompts.askForConfirmation({
        id: 'execute_action',
        message: confirmationMessage,
      });
      return {
        prompt: confirmation,
        messages: [response],
      };
    }

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
    if (!toolNodeResult || !toolNodeResult.length) {
      return {
        results: [
          {
            content: state.messages[0].content,
          },
        ],
      };
    }
    const toolMessage = toolNodeResult[toolNodeResult.length - 1];
    const parsedContent = JSON.parse(toolMessage.content as string);
    const truncatedContent = truncateJsonResponse(parsedContent.response, 6000);
    return {
      results: [
        {
          name: toolMessage.name!,
          response: truncatedContent,
          console_command: parsedContent.console_command,
        },
      ],
    };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('generate_tools', generateTools)
    .addNode('agent', callElasticsearchAgent)
    .addNode('execute_tool', executeTool)
    .addNode('check_confirmation', checkConfirmation)
    // edges
    .addConditionalEdges('__start__', checkState, {
      generate_tools: 'generate_tools',
      check_confirmation: 'check_confirmation',
    })
    .addConditionalEdges('check_confirmation', decideContinue, {
      __end__: '__end__',
      execute_tool: 'execute_tool',
    })
    .addConditionalEdges('generate_tools', terminateIfInvalidTools, {
      agent: 'agent',
      __end__: '__end__',
    })
    .addConditionalEdges('agent', askForConfirmation, {
      execute_tool: 'execute_tool',
      __end__: '__end__',
    })
    .addConditionalEdges('execute_tool', decideContinueOrEnd, {
      __end__: '__end__',
    })
    .compile();

  return graph;
};
