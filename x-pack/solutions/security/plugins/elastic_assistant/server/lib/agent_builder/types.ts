/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract, AnalyticsServiceSetup } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { RoundInput, ConversationRound } from '@kbn/onechat-common';
import type {
  Replacements,
  ContentReferencesStore,
  Message,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf, AwaitedProperties } from '@kbn/utility-types';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/server';
import type { ElasticAssistantRequestHandlerContext } from '../../types';

// Extended request type to store tool replacements temporarily
export interface ExtendedKibanaRequest {
  __toolReplacements?: Replacements;
}

export interface AgentBuilderExecuteParams {
  messages: Array<Pick<Message, 'content' | 'role'>>;
  replacements: Replacements;
  onNewReplacements: (newReplacements: Replacements) => void;
  abortSignal: AbortSignal;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  connectorId: string;
  threadId: string;
  contentReferencesStore: ContentReferencesStore;
  inferenceChatModelDisabled?: boolean;
  isOssModel?: boolean;
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  actionsClient: PublicMethodsOf<ActionsClient>;
  llmTasks?: LlmTasksPluginStart;
  inference: InferenceServerStart;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  logger: Logger;
  conversationId?: string;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  response: KibanaResponseFactory;
  responseLanguage?: string;
  isStream?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  screenContext?: unknown;
  systemPrompt?: string;
  timeout?: number;
}

export interface StreamingExecutionParams {
  onechatServices: OnechatPluginStart;
  connectorId: string;
  conversationRounds: ConversationRound[];
  nextInput: RoundInput;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  abortSignal: AbortSignal;
  contentReferencesStore: ContentReferencesStore;
  onNewReplacements: (newReplacements: Replacements) => void;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  startTime: number;
  logger: Logger;
  isEnabledKnowledgeBase: boolean;
  assistantContext: { getServerBasePath: () => string };
}

export interface NonStreamingExecutionParams {
  onechatServices: OnechatPluginStart;
  connectorId: string;
  conversationRounds: ConversationRound[];
  nextInput: RoundInput;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  abortSignal: AbortSignal;
  contentReferencesStore: ContentReferencesStore;
  onNewReplacements: (newReplacements: Replacements) => void;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  startTime: number;
  logger: Logger;
  response: KibanaResponseFactory;
  conversationId?: string;
  isEnabledKnowledgeBase: boolean;
  assistantContext: { getServerBasePath: () => string };
}

export interface ToolResultProcessorParams {
  step: { type: string; tool_id?: string; results?: Array<{ type: string; data?: unknown }> };
  result: { type: string; data?: unknown };
  contentReferencesStore: ContentReferencesStore;
  logger: Logger;
  aiResponseMessage: string;
  assistantContext: { getServerBasePath: () => string };
}

export interface ToolResultsProcessorParams {
  agentResult: {
    result: {
      round: {
        response: { message: string };
        steps?: Array<{
          type: string;
          tool_id?: string;
          results?: Array<{ type: string; data?: unknown }>;
        }>;
      };
    };
  };
  contentReferencesStore: ContentReferencesStore;
  logger: Logger;
  assistantContext: { getServerBasePath: () => string };
}
