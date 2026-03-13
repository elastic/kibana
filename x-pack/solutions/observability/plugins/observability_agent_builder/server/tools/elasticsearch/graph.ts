/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  StateGraph,
  Annotation,
  messagesStateReducer,
  START,
  END,
  Command,
} from '@langchain/langgraph';
import { tool as toTool } from '@langchain/core/tools';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { KibanaRequest } from '@kbn/core/server';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ResourceTypes } from '@kbn/product-doc-common';
import {
  createErrorResult,
  type ModelProvider,
  type ToolEventEmitter,
  type ToolPromptManager,
  type ToolStateManager,
} from '@kbn/agent-builder-server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getElasticsearchPrompt } from './prompts';
import { progressMessages } from './i18n';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { OpenAPIToolSet, type OperationObject, type Tool } from '../../utils/openapi_tool_set';
import { truncateJsonResponse } from './truncate_response';

const NODE_NAMES = {
  ROUTE_ENTRY: 'route_entry',
  GENERATE_TOOLS: 'generate_tools',
  LLM_SELECT_TOOLS: 'llm_select_tools',
  ASK_FOR_CONFIRMATION: 'ask_for_confirmation',
  EXECUTE_TOOL: 'execute_tool',
} as const;

const CONFIRMATION_IDS = {
  EXECUTE_ACTION: 'execute_action',
} as const;

/**
 * HTTP methods that are considered dangerous operations
 */
const DANGEROUS_HTTP_METHODS = new Set(['post', 'put', 'delete']);

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  // inner
  openapiSpecs: Annotation<unknown[]>(),
  tools: Annotation<Tool[]>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  openApiToolSet: Annotation<OpenAPIToolSet>(),
  // outputs
  toolOutput: Annotation<ToolHandlerReturn>(),
});

export type StateType = typeof StateAnnotation.State;
type StateManagerType = Pick<StateType, 'nlQuery' | 'openapiSpecs' | 'messages'>;

const isDangerousOperation = (
  response: AIMessageChunk,
  openApiToolSet: OpenAPIToolSet
): boolean => {
  if (!response.tool_calls || response.tool_calls.length === 0) {
    return false;
  }

  const methods = response.tool_calls
    .map((t) => openApiToolSet.getToolOperation(t.name)?.method.toLowerCase())
    .filter(Boolean) as string[];

  return methods.some((method) => DANGEROUS_HTTP_METHODS.has(method));
};

/**
 * Converts an OpenAPI-based Tool into a LangChain-compatible
 */
const toLangchainTool = (tool: Tool, esClient: IScopedClusterClient) => {
  return toTool(async (args) => tool.handler(args as Record<string, unknown>, esClient), {
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
  });
};

/**
 * Checks if a tool can be successfully converted to a LangChain tool.
 * Attempts conversion via toLangchainTool; returns false if it throws.
 */
const isValidLangchainTool = (tool: Tool, esClient: IScopedClusterClient): boolean => {
  try {
    toLangchainTool(tool, esClient);
    return true;
  } catch {
    return false;
  }
};

const parseToolResponse = async (
  toolMessage: BaseMessage,
  chatModel: BaseChatModel
): Promise<{ name: string; response: unknown; console_request?: string }> => {
  const parsedContent = JSON.parse(toolMessage.content as string);
  if (parsedContent.error) {
    return {
      name: toolMessage.name || 'unknown',
      response: parsedContent.error,
      console_request: parsedContent.consoleRequest,
    };
  }
  const truncatedContent = await truncateJsonResponse(parsedContent.response, chatModel);

  return {
    name: toolMessage.name || 'unknown',
    response: truncatedContent,
    console_request: parsedContent.consoleRequest,
  };
};

/**
 * Creates a LangGraph-based state machine for Elasticsearch query generation and execution
 *
 * Graph Flow:
 * 1. routeEntry: Routes execution based on whether the invocation is fresh or resumed
 * 2. generateTools: Retrieves OpenAPI specs, generates and validates LangChain tools,
 *    then routes to llmSelectTools on success or END on failure
 * 3. llmSelectTools: Invokes the LLM to select which Elasticsearch API tools to call
 * 4. askForConfirmation: Persists state and prompts the user (for dangerous operations)
 * 5. executeTool: Runs the selected tool against Elasticsearch
 *
 * Dangerous operations (POST, PUT, DELETE) require user confirmation before execution.
 * State can be persisted and resumed across multiple invocations.
 * @param options - Dependencies including core services, model provider, ES client, events, request, prompts, and state manager
 * @returns Compiled LangGraph StateGraph ready for execution
 */
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

  const getLlmTasks = async () => {
    const [, plugins] = await core.getStartServices();
    return plugins.llmTasks;
  };

  // Check if OpenAPI spec documentation is installed
  const isOpenApiSpecDocAvailable = async (
    llmTasks: NonNullable<Awaited<ReturnType<typeof getLlmTasks>>>
  ) => {
    try {
      return (
        (await llmTasks.retrieveDocumentationAvailable({
          inferenceId,
          resourceType: ResourceTypes.openapiSpec,
        })) ?? false
      );
    } catch {
      return false;
    }
  };

  const model = await modelProvider.getDefaultModel();

  const routeEntry = async (state: StateType) => {
    // retrieve the tool's execution state - present only if the execution was resumed
    const resumedState = stateManager.getState<StateManagerType>();
    if (!resumedState) {
      return new Command({
        goto: NODE_NAMES.GENERATE_TOOLS,
      });
    }

    const { status: confirmStatus } = prompts.checkConfirmationStatus(
      CONFIRMATION_IDS.EXECUTE_ACTION
    );
    if (confirmStatus === ConfirmationStatus.rejected) {
      return new Command({
        update: {
          toolOutput: { results: [createErrorResult(`User denied usage of the action`)] },
        },
        goto: END,
      });
    }

    const openApiToolSet = new OpenAPIToolSet(
      (resumedState as StateManagerType).openapiSpecs as OperationObject[]
    );

    return new Command({
      update: {
        ...resumedState,
        openApiToolSet,
        tools: openApiToolSet.getTools(),
      },
      goto: NODE_NAMES.EXECUTE_TOOL,
    });
  };

  const generateTools = async (state: StateType) => {
    events?.reportProgress(progressMessages.generatingTools());
    const llmTasks = await getLlmTasks();
    if (!llmTasks) {
      return {
        tools: [],
        toolOutput: {
          results: [createErrorResult({ message: 'LLM Tasks plugin is not available' })],
        },
      };
    }

    // Check if OpenAPI spec documentation is installed
    const isAvailable = await isOpenApiSpecDocAvailable(llmTasks);
    if (!isAvailable) {
      // Build the full settings URL using the request's base path (includes space prefix)
      const basePath = core.http.basePath.get(request);
      // Path to GenAI Settings within the management app
      const GENAI_SETTINGS_APP_PATH = '/app/management/ai/genAiSettings';
      const settingsUrl = `${basePath}${GENAI_SETTINGS_APP_PATH}`;

      return {
        tools: [],
        toolOutput: {
          results: [
            createErrorResult({
              message: `OpenAPI spec documentation is not installed. To use this tool, please install Elastic documentation from the GenAI Settings page: ${settingsUrl}. Do not perform any other tool calls, and provide the user with a link to install the documentation.`,
              metadata: {
                settingsUrl,
              },
            }),
          ],
        },
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

    const openApiToolSet = new OpenAPIToolSet(openapiSpecs);

    const tools = openApiToolSet.getTools();

    return {
      openapiSpecs,
      openApiToolSet,
      tools,
    };
  };

  const terminateIfInvalidTools = async (state: StateType) => {
    const validTools = state.tools.filter((tool) => isValidLangchainTool(tool, esClient));
    return validTools.length > 0 ? NODE_NAMES.LLM_SELECT_TOOLS : END;
  };

  const askForConfirmation = async (state: StateType) => {
    stateManager.setState({
      openapiSpecs: state.openapiSpecs,
      nlQuery: state.nlQuery,
      messages: state.messages,
    });

    const aiMessage = state.messages[state.messages.length - 1] as AIMessageChunk;
    const consoleRequests = aiMessage.tool_calls!.map((t) =>
      state.openApiToolSet.formatConsoleRequest(t.name, t.args)
    );
    const confirmationMessage = `
    Are you sure you want to call this Elasticsearch API? **${consoleRequests.join(', ')}**
    `;

    const prompt = await prompts.askForConfirmation({
      id: CONFIRMATION_IDS.EXECUTE_ACTION,
      message: confirmationMessage,
    });
    return { toolOutput: prompt };
  };

  const llmSelectTools = async (state: StateType) => {
    events?.reportProgress(progressMessages.callingElasticsearchAgent());
    const tools = state.tools.map((tool) => toLangchainTool(tool, esClient));
    const searchModel = model.chatModel.bindTools(tools).withConfig({
      tags: ['observability-elasticsearch-tool'],
    });
    const response = await searchModel.invoke(
      getElasticsearchPrompt({ nlQuery: state.nlQuery, tools })
    );
    if (response.tool_calls?.length === 0) {
      if (response.content) {
        return new Command({
          update: {
            toolOutput: {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: response.content,
                  },
                },
              ],
            },
          },
          goto: END,
        });
      }

      return new Command({
        update: {
          toolOutput: { results: [createErrorResult(`No tools were selected`)] },
        },
        goto: END,
      });
    }
    if (isDangerousOperation(response, state.openApiToolSet)) {
      return new Command({
        update: {
          messages: [response],
        },
        goto: NODE_NAMES.ASK_FOR_CONFIRMATION,
      });
    }

    return new Command({
      update: {
        messages: [response],
      },
      goto: NODE_NAMES.EXECUTE_TOOL,
    });
  };

  const executeTool = async (state: StateType) => {
    events?.reportProgress(progressMessages.performingElasticsearchTool());
    const tools = state.tools.map((tool) => toLangchainTool(tool, esClient));
    const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);
    const toolNodeResult = await toolNode.invoke(state.messages);
    const toolMessage = toolNodeResult[toolNodeResult.length - 1];
    const toolResponse = await parseToolResponse(toolMessage, model.chatModel);

    return {
      toolOutput: {
        results: [
          {
            type: ToolResultType.other,
            data: toolResponse,
          },
        ],
      },
    };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(NODE_NAMES.ROUTE_ENTRY, routeEntry, {
      ends: [NODE_NAMES.GENERATE_TOOLS, NODE_NAMES.EXECUTE_TOOL, END],
    })
    .addNode(NODE_NAMES.GENERATE_TOOLS, generateTools)
    .addNode(NODE_NAMES.LLM_SELECT_TOOLS, llmSelectTools, {
      ends: [NODE_NAMES.ASK_FOR_CONFIRMATION, NODE_NAMES.EXECUTE_TOOL, END],
    })
    .addNode(NODE_NAMES.ASK_FOR_CONFIRMATION, askForConfirmation)
    .addNode(NODE_NAMES.EXECUTE_TOOL, executeTool)
    // edges
    .addEdge(START, NODE_NAMES.ROUTE_ENTRY)
    .addConditionalEdges(NODE_NAMES.GENERATE_TOOLS, terminateIfInvalidTools, {
      [NODE_NAMES.LLM_SELECT_TOOLS]: NODE_NAMES.LLM_SELECT_TOOLS,
      [END]: END,
    })
    .addEdge(NODE_NAMES.ASK_FOR_CONFIRMATION, END)
    .addEdge(NODE_NAMES.EXECUTE_TOOL, END)
    .compile();

  return graph;
};
