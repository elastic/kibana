/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import {
  StateGraph,
  Annotation,
  messagesStateReducer,
  START,
  END,
  Command,
} from '@langchain/langgraph';
import { tool as toTool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { ResourceTypes } from '@kbn/product-doc-common';
import {
  createErrorResult,
  type ModelProvider,
  type ToolEventEmitter,
  type ToolPromptManager,
  type ToolStateManager,
} from '@kbn/agent-builder-server';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { extractTextContent, extractToolCalls } from '@kbn/agent-builder-genai-utils/langchain';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getElasticsearchPrompt, getRefineSearchTermPrompt } from './prompts';
import { progressMessages } from './i18n';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import {
  type ConsoleRequest,
  OpenAPIToolSet,
  type OperationObject,
  type Tool,
} from '../../utils/openapi_tool_set';
import { truncateJsonResponse } from './truncate_response';

const NODE_NAMES = {
  ROUTE_ENTRY: 'route_entry',
  GENERATE_TOOLS: 'generate_tools',
  LLM_SELECT_TOOLS: 'llm_select_tools',
  ASK_FOR_CONFIRMATION: 'ask_for_confirmation',
  EXECUTE_TOOL: 'execute_tool',
} as const;

/**
 * HTTP methods that are considered dangerous operations
 */
const DANGEROUS_HTTP_METHODS = new Set(['post', 'put', 'delete']);

/**
 * POST paths that are read-only and do not require user confirmation.
 */
const SAFE_POST_PATH_PATTERNS: readonly RegExp[] = [
  /\/_search$/, // POST /_search, POST /{index}/_search
  /\/_msearch$/, // POST /_msearch, POST /{index}/_msearch
  /\/_count$/, // POST /_count, POST /{index}/_count
  /\/_eql\/search$/, // POST /{index}/_eql/search
  /^\/_esql$/, // POST /_esql
  /\/_mget$/, // POST /_mget, POST /{index}/_mget
];

const isSafePostOperation = (path: string): boolean =>
  SAFE_POST_PATH_PATTERNS.some((pattern) => pattern.test(path));

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

const isDangerousOperation = (response: BaseMessage, openApiToolSet: OpenAPIToolSet): boolean => {
  const toolCalls = extractToolCalls(response);
  if (toolCalls.length === 0) {
    return false;
  }

  return toolCalls.some((t) => {
    const operation = openApiToolSet.getToolOperation(t.toolName);
    if (!operation) return false;
    const method = operation.method.toLowerCase();
    if (!DANGEROUS_HTTP_METHODS.has(method)) return false;
    if (method === 'post' && isSafePostOperation(operation.path)) return false;
    return true;
  });
};

/**
 * Converts an OpenAPI-based Tool into a LangChain-compatible tool.
 * The tool's schema is a Zod object built by buildSchema in openapi_tool_set.ts
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
const isValidLangchainTool = (
  tool: Tool,
  esClient: IScopedClusterClient,
  logger: Logger
): boolean => {
  try {
    toLangchainTool(tool, esClient);
    return true;
  } catch (err) {
    logger.debug(`Skipping invalid tool "${tool.name}": ${err.message}`);
    return false;
  }
};

const parseToolResponse = async (
  toolMessage: BaseMessage,
  chatModel: BaseChatModel
): Promise<{
  name: string;
  response?: unknown;
  console_request?: ConsoleRequest;
  error?: string;
  statusCode?: number;
}> => {
  const content = extractTextContent(toolMessage);
  let parsedContent: Record<string, unknown>;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return {
      name: toolMessage.name || 'unknown',
      error: content,
    };
  }
  if ('error' in parsedContent) {
    return {
      name: toolMessage.name || 'unknown',
      error:
        typeof parsedContent.error === 'string'
          ? parsedContent.error
          : JSON.stringify(parsedContent.error),
      statusCode:
        typeof parsedContent.statusCode === 'number' ? parsedContent.statusCode : undefined,
      console_request: parsedContent.consoleRequest as ConsoleRequest,
    };
  }
  const truncatedContent = await truncateJsonResponse(parsedContent.response, chatModel);

  return {
    name: toolMessage.name || 'unknown',
    response: truncatedContent,
    console_request: parsedContent.consoleRequest as ConsoleRequest,
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
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  events: ToolEventEmitter;
  request: KibanaRequest;
  prompts: ToolPromptManager;
  stateManager: ToolStateManager;
  logger: Logger;
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

    const { status: confirmStatus } = prompts.checkConfirmationStatus('execute_action');
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

    // Refine the user query into an API-focused search term so the
    // semantic search ranks the correct OpenAPI spec higher.
    const refinedResponse = await model.chatModel.invoke(
      getRefineSearchTermPrompt({ nlQuery: state.nlQuery })
    );
    const refinedContent = refinedResponse.content;
    const refinedSearchTerm =
      typeof refinedContent === 'string' && refinedContent.trim()
        ? refinedContent.trim()
        : state.nlQuery;

    const result = await llmTasks.retrieveDocumentation({
      searchTerm: refinedSearchTerm,
      products: ['elasticsearch'],
      resourceTypes: ['openapi_spec'],
      max: 5,
      connectorId: connector.connectorId,
      request,
      inferenceId,
      tokenReductionStrategy: 'none', // we want the full spec to generate tools, we will truncate the response from the tools if needed
    });

    const openapiSpecs = result.documents.map((doc) => JSON.parse(doc.content));

    if (openapiSpecs.length === 0) {
      return {
        tools: [],
        toolOutput: {
          results: [
            createErrorResult({
              message: `No relevant Elasticsearch API documentation was found for the query: "${state.nlQuery}". Try rephrasing your request or check that the OpenAPI spec documentation is installed.`,
            }),
          ],
        },
      };
    }

    const openApiToolSet = new OpenAPIToolSet(openapiSpecs);

    const tools = openApiToolSet.getTools();

    return {
      openapiSpecs,
      openApiToolSet,
      tools,
    };
  };

  const terminateIfInvalidTools = async (state: StateType) => {
    const validTools = state.tools.filter((tool) => isValidLangchainTool(tool, esClient, logger));
    return validTools.length > 0 ? NODE_NAMES.LLM_SELECT_TOOLS : END;
  };

  const askForConfirmation = async (state: StateType) => {
    stateManager.setState({
      openapiSpecs: state.openapiSpecs,
      nlQuery: state.nlQuery,
      messages: state.messages,
    });

    const lastMessage = state.messages[state.messages.length - 1];
    const consoleRequests = extractToolCalls(lastMessage).map((t) => {
      const consoleRequest = state.openApiToolSet.formatConsoleRequest(t.toolName, t.args);
      if (typeof consoleRequest === 'string') {
        return consoleRequest;
      }
      return `${consoleRequest.command}\n${JSON.stringify(consoleRequest.body, null, 2)}`;
    });

    const confirmationMessage = dedent(`
      Are you sure you want to call this Elasticsearch API?
      ${consoleRequests.join('\n')}
    `);

    const prompt = await prompts.askForConfirmation({
      id: 'execute_action',
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
              results: [otherResult({ message: response.content })],
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
    const toolResponses = await Promise.all(
      toolNodeResult.map((toolMessage) => parseToolResponse(toolMessage, model.chatModel))
    );

    return {
      toolOutput: {
        results: toolResponses.map((toolResponse) => otherResult(toolResponse)),
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
