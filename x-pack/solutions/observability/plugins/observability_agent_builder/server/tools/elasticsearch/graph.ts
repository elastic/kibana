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
import { OpenAPIToolSet, type OperationObject } from '../../utils/openapi_tool_set';
import { truncateJsonResponse } from './truncate_response';
/**
 * Node names in the state graph
 */
const NODE_NAMES = {
  ROUTE_ENTRY: 'route_entry',
  GENERATE_TOOLS: 'generate_tools',
  AGENT: 'agent',
  ASK_FOR_CONFIRMATION: 'ask_for_confirmation',
  EXECUTE_TOOL: 'execute_tool',
} as const;

/**
 * Confirmation IDs for user prompts
 */
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
  toolsValid: Annotation<boolean>(),
  openapiSpecs: Annotation<unknown[]>(),
  tools: Annotation<Tool[]>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  openApiToolSet: Annotation<OpenAPIToolSet>(),
  // outputs
  error: Annotation<string>(),
  result: Annotation<{ content: unknown }>(),
  prompt: Annotation<ToolHandlerPromptReturn>(),
});

export type StateType = typeof StateAnnotation.State;
type StateManagerType = Pick<StateType, 'nlQuery' | 'toolsValid' | 'openapiSpecs' | 'messages'>;

/**
 * Encapsulates graph context and dependencies
 */
interface GraphContext {
  core: ObservabilityAgentBuilderCoreSetup;
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  events: ToolEventEmitter;
  request: KibanaRequest;
  prompts: ToolPromptManager;
  stateManager: ToolStateManager;
}

/**
 * Detects if an API response requires user confirmation before execution
 */
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
 * Formats confirmation message with API commands
 */
const buildConfirmationMessage = (commands: string[]): string => {
  return `Are you sure you want to call these Elasticsearch APIs?\n\n${commands.join('\n')}`;
};

/**
 * Creates wrapper tools compatible with LangGraph ToolNode
 */
const createExecutableTools = (tools: Tool[], esClient: IScopedClusterClient): any[] => {
  return tools.map((tool) =>
    toTool(
      async (args) =>
        (tool as Tool & { handler: (args: any, esClient: IScopedClusterClient) => void }).handler(
          args,
          esClient
        ),
      {
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
      }
    )
  );
};

/**
 * Parses and truncates tool response
 */
const parseToolResponse = (
  toolMessage: BaseMessage
): { name: string; response: unknown; console_command?: string } => {
  const parsedContent = JSON.parse(toolMessage.content as string);
  const truncatedContent = truncateJsonResponse(parsedContent.response);

  return {
    name: toolMessage.name || 'unknown',
    response: truncatedContent,
    console_command: parsedContent.console_command,
  };
};

/**
 * Creates a LangGraph-based state machine for Elasticsearch query generation and execution
 *
 * Graph Flow:
 * 1. routeEntry: Routes execution based on whether the invocation is fresh or resumed
 * 2. generateTools: Retrieves OpenAPI specs and generates LangChain tools
 * 3. terminateIfInvalidTools: Validates that tools were generated successfully
 * 4. agent: Calls the LLM to generate tool calls based on natural language query
 * 5. askForConfirmation: Checks if confirmation was provided (for dangerous operations)
 * 6. executeTool: Runs the selected tool against Elasticsearch
 *
 * Dangerous operations (POST, PUT, DELETE) require user confirmation before execution.
 * State can be persisted and resumed across multiple invocations.
 * @param context - Encapsulated dependencies including core services, model provider, etc.
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
}: GraphContext) => {
  // TODO make this configurable, we need a platform level setting for the embedding model
  const inferenceId = defaultInferenceEndpoints.ELSER;

  /**
   * Resolves LLM Tasks plugin from core services
   */
  const getLlmTasks = async () => {
    const [, plugins] = await core.getStartServices();
    return plugins.llmTasks;
  };

  const model = await modelProvider.getDefaultModel();

  /**
   * Routes execution to the appropriate node based on whether
   * the invocation is fresh (-> generateTools) or resumed after
   * a user confirmation prompt (-> executeTool or end).
   */
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
          result: createErrorResult(`User denied usage of the action`),
        },
        goto: END,
      });
    }

    const openApiToolSet = new OpenAPIToolSet({
      operations: (resumedState as StateManagerType).openapiSpecs as OperationObject[],
    });

    return new Command({
      update: {
        ...resumedState,
        openApiToolSet,
        tools: openApiToolSet.getTools(),
      },
      goto: NODE_NAMES.EXECUTE_TOOL,
    });
  };

  /**
   * Generates LangChain tools from retrieved OpenAPI specifications
   */
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
        openapiSpecs,
        openApiToolSet,
        tools,
      };
    } else {
      return {
        toolsValid: false,
        error: `Could not dynamically generate tools`,
      };
    }
  };

  const terminateIfInvalidTools = async (state: StateType) => {
    return state.toolsValid ? NODE_NAMES.AGENT : END;
  };

  const askForConfirmation = async (state: StateType) => {
    stateManager.setState({
      openapiSpecs: state.openapiSpecs,
      nlQuery: state.nlQuery,
      toolsValid: state.toolsValid,
      messages: state.messages,
    });

    const aiMessage = state.messages[state.messages.length - 1] as AIMessageChunk;
    const commands = aiMessage.tool_calls!.map((t) =>
      state.openApiToolSet.getApiCallConsoleCommand(t.name, t.args)
    );
    const confirmationMessage = buildConfirmationMessage(commands);

    const confirmation = await prompts.askForConfirmation({
      id: CONFIRMATION_IDS.EXECUTE_ACTION,
      message: confirmationMessage,
    });
    return { prompt: confirmation };
  };

  const callElasticsearchAgent = async (state: StateType) => {
    events?.reportProgress(progressMessages.callingElasticsearchAgent());
    const searchModel = model.chatModel.bindTools(state.tools).withConfig({
      tags: ['observability-elasticsearch-tool'],
    });
    const response = await searchModel.invoke(
      getElasticsearchPrompt({ nlQuery: state.nlQuery, tools: state.tools })
    );
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
    const tools = createExecutableTools(state.tools, esClient);
    const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);
    const toolNodeResult = await toolNode.invoke(state.messages);

    if (!toolNodeResult || !toolNodeResult.length) {
      return {
        result: {
          content: state.messages[0].content,
        },
      };
    }

    const toolMessage = toolNodeResult[toolNodeResult.length - 1];
    const toolResponse = parseToolResponse(toolMessage);

    return {
      result: toolResponse,
    };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(NODE_NAMES.ROUTE_ENTRY, routeEntry, {
      ends: [NODE_NAMES.GENERATE_TOOLS, NODE_NAMES.EXECUTE_TOOL, END],
    })
    .addNode(NODE_NAMES.GENERATE_TOOLS, generateTools)
    .addNode(NODE_NAMES.AGENT, callElasticsearchAgent, {
      ends: [NODE_NAMES.ASK_FOR_CONFIRMATION, NODE_NAMES.EXECUTE_TOOL],
    })
    .addNode(NODE_NAMES.ASK_FOR_CONFIRMATION, askForConfirmation)
    .addNode(NODE_NAMES.EXECUTE_TOOL, executeTool)
    // edges
    .addEdge(START, NODE_NAMES.ROUTE_ENTRY)
    .addConditionalEdges(NODE_NAMES.GENERATE_TOOLS, terminateIfInvalidTools, {
      [NODE_NAMES.AGENT]: NODE_NAMES.AGENT,
      [END]: END,
    })
    .addEdge(NODE_NAMES.ASK_FOR_CONFIRMATION, END)
    .addEdge(NODE_NAMES.EXECUTE_TOOL, END)
    .compile();

  return graph;
};
