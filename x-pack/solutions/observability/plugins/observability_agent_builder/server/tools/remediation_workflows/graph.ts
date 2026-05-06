/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ModelProvider,
  ToolEventEmitter,
  ToolPromptManager,
  ToolStateManager,
} from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import dedent from 'dedent';
import {
  StateGraph,
  Annotation,
  messagesStateReducer,
  START,
  END,
  Command,
} from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { extractTextContent, extractToolCalls } from '@kbn/agent-builder-genai-utils/langchain';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { getRemediationWorkflowPrompt } from './prompts';
import { progressMessages } from './i18n';
import { createRemediationWorkflowTools } from './create_remediation_workflow_tools';

const NODE_NAMES = {
  ROUTE_ENTRY: 'route_entry',
  GENERATE_TOOLS: 'generate_tools',
  LLM_SELECT_TOOLS: 'llm_select_tools',
  ASK_FOR_CONFIRMATION: 'ask_for_confirmation',
  EXECUTE_TOOL: 'execute_tool',
} as const;

const StateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  tools: Annotation<StructuredToolInterface[]>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  toolOutput: Annotation<ToolHandlerReturn>(),
});

export type StateType = typeof StateAnnotation.State;
type StateManagerType = Pick<StateType, 'query' | 'messages'>;

const isDangerousOperation = (response: BaseMessage): boolean => {
  // All remediation workflow tool calls perform mutating emergency actions and require HITL confirmation.
  return extractToolCalls(response).length > 0;
};

const parseToolResponse = async (
  toolMessage: BaseMessage
): Promise<{
  name: string;
  response?: unknown;
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
    };
  }

  return {
    name: toolMessage.name || 'unknown',
    response: parsedContent.response,
  };
};

/**
 * LangGraph for natural-language remediation: build inner tools, let the model pick one workflow, confirm, then execute.
 */
export const createRemediationWorkflowToolGraph = async ({
  modelProvider,
  events,
  request,
  spaceId,
  workflowApi,
  prompts,
  stateManager,
  logger,
}: {
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowsServerPluginSetup['management'];
  prompts: ToolPromptManager;
  stateManager: ToolStateManager;
  logger: Logger;
}) => {
  const buildTools = () =>
    createRemediationWorkflowTools({
      request,
      spaceId,
      workflowApi,
      logger,
    });

  const model = await modelProvider.getDefaultModel();

  const routeEntry = async (state: StateType) => {
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

    return new Command({
      update: {
        ...resumedState,
        tools: buildTools(),
      },
      goto: NODE_NAMES.EXECUTE_TOOL,
    });
  };

  const generateTools = async () => {
    events?.reportProgress(progressMessages.generatingTools());

    return {
      tools: buildTools(),
    };
  };

  const askForConfirmation = async (state: StateType) => {
    stateManager.setState({
      query: state.query,
      messages: state.messages,
    });

    const confirmationMessage = dedent(`
      Are you sure you want to call this remediation workflow?
    `);

    const prompt = await prompts.askForConfirmation({
      id: 'execute_action',
      message: confirmationMessage,
    });
    return { toolOutput: prompt };
  };

  const llmSelectTools = async (state: StateType) => {
    events?.reportProgress(progressMessages.selectingRemediationWorkflow());
    const tools = state.tools;
    const searchModel = model.chatModel.bindTools(tools).withConfig({
      tags: ['observability-remediation-workflow-tool'],
    });
    const response = await searchModel.invoke(
      getRemediationWorkflowPrompt({ query: state.query, tools })
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
    if (isDangerousOperation(response)) {
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
    events?.reportProgress(progressMessages.runningRemediationWorkflow());
    const tools = state.tools;
    const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);
    const toolNodeResult = await toolNode.invoke(state.messages);
    const toolResponses = await Promise.all(
      toolNodeResult.map((toolMessage) => parseToolResponse(toolMessage))
    );

    return {
      toolOutput: {
        results: toolResponses.map((toolResponse) => otherResult(toolResponse)),
      },
    };
  };

  const graph = new StateGraph(StateAnnotation)
    .addNode(NODE_NAMES.ROUTE_ENTRY, routeEntry, {
      ends: [NODE_NAMES.GENERATE_TOOLS, NODE_NAMES.EXECUTE_TOOL, END],
    })
    .addNode(NODE_NAMES.GENERATE_TOOLS, generateTools)
    .addNode(NODE_NAMES.LLM_SELECT_TOOLS, llmSelectTools, {
      ends: [NODE_NAMES.ASK_FOR_CONFIRMATION, NODE_NAMES.EXECUTE_TOOL, END],
    })
    .addNode(NODE_NAMES.ASK_FOR_CONFIRMATION, askForConfirmation)
    .addNode(NODE_NAMES.EXECUTE_TOOL, executeTool)
    .addEdge(START, NODE_NAMES.ROUTE_ENTRY)
    .addEdge(NODE_NAMES.GENERATE_TOOLS, NODE_NAMES.LLM_SELECT_TOOLS)
    .addEdge(NODE_NAMES.ASK_FOR_CONFIRMATION, END)
    .addEdge(NODE_NAMES.EXECUTE_TOOL, END)
    .compile();

  return graph;
};
