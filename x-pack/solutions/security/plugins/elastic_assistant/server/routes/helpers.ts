/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnalyticsServiceSetup,
  type AuthenticatedUser,
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';

import {
  TraceData,
  Message,
  Replacements,
  replaceAnonymizedValuesWithOriginalValues,
  DEFEND_INSIGHTS_TOOL_ID,
} from '@kbn/elastic-assistant-common';
import { ILicense } from '@kbn/licensing-plugin/server';
import { i18n } from '@kbn/i18n';
import { AwaitedProperties, PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { AssistantFeatureKey } from '@kbn/elastic-assistant-common/impl/capabilities';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import { INVOKE_ASSISTANT_SUCCESS_EVENT } from '../lib/telemetry/event_based_telemetry';
import { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';
import { FindResponse } from '../ai_assistant_data_clients/find';
import { EsPromptsSchema } from '../ai_assistant_data_clients/prompts/types';
import { AIAssistantDataClient } from '../ai_assistant_data_clients';
import { MINIMUM_AI_ASSISTANT_LICENSE } from '../../common/constants';
import { SECURITY_LABS_RESOURCE, SECURITY_LABS_LOADED_QUERY } from './knowledge_base/constants';
import { buildResponse, getLlmType } from './utils';
import {
  AgentExecutorParams,
  AssistantDataClients,
  StaticReturnType,
} from '../lib/langchain/executors/types';
import { getLangChainMessages } from '../lib/langchain/helpers';

import { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import { callAssistantGraph } from '../lib/langchain/graphs/default_assistant_graph';

interface GetPluginNameFromRequestParams {
  request: KibanaRequest;
  defaultPluginName: string;
  logger?: Logger;
}

export const DEFAULT_PLUGIN_NAME = 'securitySolutionUI';

export const NEW_CHAT = i18n.translate('xpack.elasticAssistantPlugin.server.newChat', {
  defaultMessage: 'New chat',
});

/**
 * Attempts to extract the plugin name the request originated from using the request headers.
 *
 * Note from Kibana Core: This is not a 100% fit solution, though, because plugins can run in the background,
 * or even use other plugins’ helpers (ie, APM can use the infra helpers to call a third plugin)
 *
 * Should suffice for our purposes here with where the Elastic Assistant is currently used, but if needing a
 * dedicated solution, the core folks said to reach out.
 *
 * @param logger optional logger to log any errors
 * @param defaultPluginName default plugin name to use if unable to determine from request
 * @param request Kibana Request
 *
 * @returns plugin name
 */
export const getPluginNameFromRequest = ({
  logger,
  defaultPluginName,
  request,
}: GetPluginNameFromRequestParams): string => {
  try {
    const contextHeader = request.headers['x-kbn-context'];
    if (contextHeader != null) {
      return JSON.parse(
        decodeURIComponent(Array.isArray(contextHeader) ? contextHeader[0] : contextHeader)
      )?.name;
    }
  } catch (err) {
    logger?.error(
      `Error determining source plugin for selecting tools, using ${defaultPluginName}.`
    );
  }
  return defaultPluginName;
};

export const getMessageFromRawResponse = ({
  rawContent,
  isError,
  traceData,
}: {
  rawContent?: string;
  traceData?: TraceData;
  isError?: boolean;
}): Message => {
  const dateTimeString = new Date().toISOString();
  if (rawContent) {
    return {
      role: 'assistant',
      content: rawContent,
      timestamp: dateTimeString,
      isError,
      traceData,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
      isError: true,
    };
  }
};

export const hasAIAssistantLicense = (license: ILicense): boolean =>
  license.hasAtLeast(MINIMUM_AI_ASSISTANT_LICENSE);

export const UPGRADE_LICENSE_MESSAGE =
  'Your license does not support AI Assistant. Please upgrade your license.';

export interface GetSystemPromptFromUserConversationParams {
  conversationsDataClient: AIAssistantConversationsDataClient;
  conversationId: string;
  promptsDataClient: AIAssistantDataClient;
}
const extractPromptFromESResult = (result: FindResponse<EsPromptsSchema>): string | undefined => {
  if (result.total > 0 && result.data.hits.hits.length > 0) {
    return result.data.hits.hits[0]._source?.content;
  }
  return undefined;
};

export const getSystemPromptFromUserConversation = async ({
  conversationsDataClient,
  conversationId,
  promptsDataClient,
}: GetSystemPromptFromUserConversationParams): Promise<string | undefined> => {
  const conversation = await conversationsDataClient.getConversation({ id: conversationId });
  if (!conversation) {
    return undefined;
  }
  const currentSystemPromptId = conversation.apiConfig?.defaultSystemPromptId;
  if (!currentSystemPromptId) {
    return undefined;
  }
  const result = await promptsDataClient.findDocuments<EsPromptsSchema>({
    perPage: 1,
    page: 1,
    filter: `_id: "${currentSystemPromptId}"`,
  });
  return extractPromptFromESResult(result);
};

export interface AppendAssistantMessageToConversationParams {
  conversationsDataClient: AIAssistantConversationsDataClient;
  messageContent: string;
  replacements: Replacements;
  conversationId: string;
  isError?: boolean;
  traceData?: Message['traceData'];
}
export const appendAssistantMessageToConversation = async ({
  conversationsDataClient,
  messageContent,
  replacements,
  conversationId,
  isError = false,
  traceData = {},
}: AppendAssistantMessageToConversationParams) => {
  const conversation = await conversationsDataClient.getConversation({ id: conversationId });
  if (!conversation) {
    return;
  }

  await conversationsDataClient.appendConversationMessages({
    existingConversation: conversation,
    messages: [
      getMessageFromRawResponse({
        rawContent: replaceAnonymizedValuesWithOriginalValues({
          messageContent,
          replacements,
        }),
        traceData,
        isError,
      }),
    ],
  });
  if (Object.keys(replacements).length > 0) {
    await conversationsDataClient?.updateConversation({
      conversationUpdateProps: {
        id: conversation.id,
        replacements,
      },
    });
  }
};

export interface LangChainExecuteParams {
  messages: Array<Pick<Message, 'content' | 'role'>>;
  replacements: Replacements;
  isStream?: boolean;
  onNewReplacements: (newReplacements: Replacements) => void;
  abortSignal: AbortSignal;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  connectorId: string;
  llmTasks?: LlmTasksPluginStart;
  inference: InferenceServerStart;
  isOssModel?: boolean;
  conversationId?: string;
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  actionsClient: PublicMethodsOf<ActionsClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<unknown, unknown, any>;
  logger: Logger;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  getElser: GetElser;
  response: KibanaResponseFactory;
  responseLanguage?: string;
  systemPrompt?: string;
}
export const langChainExecute = async ({
  messages,
  replacements,
  onNewReplacements,
  abortSignal,
  telemetry,
  actionTypeId,
  connectorId,
  isOssModel,
  context,
  actionsClient,
  llmTasks,
  inference,
  request,
  logger,
  conversationId,
  onLlmResponse,
  getElser,
  response,
  responseLanguage,
  isStream = true,
  systemPrompt,
}: LangChainExecuteParams) => {
  // Fetch any tools registered by the request's originating plugin
  const pluginName = getPluginNameFromRequest({
    request,
    defaultPluginName: DEFAULT_PLUGIN_NAME,
    logger,
  });
  const assistantContext = context.elasticAssistant;
  // We don't (yet) support invoking these tools interactively
  const unsupportedTools = new Set(['attack-discovery', DEFEND_INSIGHTS_TOOL_ID]);
  const assistantTools = assistantContext
    .getRegisteredTools(pluginName)
    .filter((tool) => !unsupportedTools.has(tool.id));

  // get a scoped esClient for assistant memory
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  // convert the assistant messages to LangChain messages:
  const langChainMessages = getLangChainMessages(messages);

  const anonymizationFieldsDataClient =
    await assistantContext.getAIAssistantAnonymizationFieldsDataClient();
  const conversationsDataClient = await assistantContext.getAIAssistantConversationsDataClient();

  // Create an ElasticsearchStore for KB interactions
  const kbDataClient =
    (await assistantContext.getAIAssistantKnowledgeBaseDataClient()) ?? undefined;

  const dataClients: AssistantDataClients = {
    anonymizationFieldsDataClient: anonymizationFieldsDataClient ?? undefined,
    conversationsDataClient: conversationsDataClient ?? undefined,
    kbDataClient,
  };

  const isKnowledgeBaseInstalled = await getIsKnowledgeBaseInstalled(kbDataClient);
  // Shared executor params
  const executorParams: AgentExecutorParams<boolean> = {
    abortSignal,
    dataClients,
    alertsIndexPattern: request.body.alertsIndexPattern,
    actionsClient,
    assistantTools,
    conversationId,
    connectorId,
    esClient,
    llmTasks,
    inference,
    isStream,
    llmType: getLlmType(actionTypeId),
    isOssModel,
    langChainMessages,
    logger,
    onNewReplacements,
    onLlmResponse,
    request,
    replacements,
    responseLanguage,
    size: request.body.size,
    systemPrompt,
    telemetry,
    telemetryParams: {
      actionTypeId,
      model: request.body.model,
      assistantStreamingEnabled: isStream,
      isEnabledKnowledgeBase: isKnowledgeBaseInstalled,
      eventType: INVOKE_ASSISTANT_SUCCESS_EVENT.eventType,
    },
    traceOptions: {
      projectName: request.body.langSmithProject,
      tracers: getLangSmithTracer({
        apiKey: request.body.langSmithApiKey,
        projectName: request.body.langSmithProject,
        logger,
      }),
    },
  };

  const result: StreamResponseWithHeaders | StaticReturnType = await callAssistantGraph(
    executorParams
  );

  return response.ok<StreamResponseWithHeaders['body'] | StaticReturnType['body']>(result);
};

export interface CreateConversationWithParams {
  conversationsDataClient: AIAssistantConversationsDataClient;
  replacements: Replacements;
  conversationId?: string;
  promptId?: string;
  actionTypeId: string;
  connectorId: string;
  newMessages?: Array<Pick<Message, 'content' | 'role'>>;
  model?: string;
}
export const createConversationWithUserInput = async ({
  conversationsDataClient,
  replacements,
  conversationId,
  actionTypeId,
  promptId,
  connectorId,
  newMessages,
  model,
}: CreateConversationWithParams) => {
  if (!conversationId) {
    if (newMessages && newMessages.length > 0) {
      return conversationsDataClient.createConversation({
        conversation: {
          title: NEW_CHAT,
          messages: newMessages.map((m) => ({
            content: m.content,
            role: m.role,
            timestamp: new Date().toISOString(),
          })),
          replacements,
          apiConfig: {
            connectorId,
            actionTypeId,
            model,
            defaultSystemPromptId: promptId,
          },
        },
      });
    }
  }
};

interface PerformChecksParams {
  capability?: AssistantFeatureKey;
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  request: KibanaRequest;
  response: KibanaResponseFactory;
}

/**
 * Helper to perform checks for authenticated user, license, and optionally capability.
 * Check order is license, authenticated user, then capability.
 *
 * Returns either a successful check with an AuthenticatedUser or
 * an unsuccessful check with an error IKibanaResponse.
 *
 * @param capability - Specific capability to check if enabled, e.g. `assistantModelEvaluation`
 * @param context - Route context
 * @param request - Route KibanaRequest
 * @param response - Route KibanaResponseFactory
 * @returns PerformChecks
 */

type PerformChecks =
  | {
      isSuccess: true;
      currentUser: AuthenticatedUser;
    }
  | {
      isSuccess: false;
      response: IKibanaResponse;
    };
export const performChecks = ({
  capability,
  context,
  request,
  response,
}: PerformChecksParams): PerformChecks => {
  const assistantResponse = buildResponse(response);

  if (!hasAIAssistantLicense(context.licensing.license)) {
    return {
      isSuccess: false,
      response: response.forbidden({
        body: {
          message: UPGRADE_LICENSE_MESSAGE,
        },
      }),
    };
  }

  const currentUser = context.elasticAssistant.getCurrentUser();

  if (currentUser == null) {
    return {
      isSuccess: false,
      response: assistantResponse.error({
        body: `Authenticated user not found`,
        statusCode: 401,
      }),
    };
  }

  if (capability) {
    const pluginName = getPluginNameFromRequest({
      request,
      defaultPluginName: DEFAULT_PLUGIN_NAME,
    });
    const registeredFeatures = context.elasticAssistant.getRegisteredFeatures(pluginName);
    if (!registeredFeatures[capability]) {
      return {
        isSuccess: false,
        response: response.notFound(),
      };
    }
  }

  return {
    isSuccess: true,
    currentUser,
  };
};

/**
 * Telemetry function to determine whether knowledge base has been installed
 * @param kbDataClient
 */
export const getIsKnowledgeBaseInstalled = async (
  kbDataClient?: AIAssistantKnowledgeBaseDataClient | null
): Promise<boolean> => {
  let securityLabsDocsExist = false;
  let isInferenceEndpointExists = false;
  if (kbDataClient != null) {
    try {
      isInferenceEndpointExists = await kbDataClient.isInferenceEndpointExists();
      if (isInferenceEndpointExists) {
        securityLabsDocsExist =
          (
            await kbDataClient.getKnowledgeBaseDocumentEntries({
              kbResource: SECURITY_LABS_RESOURCE,
              query: SECURITY_LABS_LOADED_QUERY,
            })
          ).length > 0;
      }
    } catch (e) {
      /* if telemetry related requests fail, fallback to default values */
    }
  }

  return isInferenceEndpointExists && securityLabsDocsExist;
};
