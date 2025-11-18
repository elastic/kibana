/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { BaseMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest, KibanaResponseFactory, ResponseHeaders } from '@kbn/core-http-server';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type {
  ContentReferencesStore,
  ExecuteConnectorRequestBody,
  InterruptValue,
  Message,
  Replacements,
  ScreenContext,
} from '@kbn/elastic-assistant-common';
import type { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { TelemetryParams } from '@kbn/langchain/server/tracers/telemetry/telemetry_tracer';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CoreRequestHandlerContext } from '@kbn/core/server';
import type { ResponseBody } from '../types';
import type { AssistantTool, ElasticAssistantApiRequestHandlerContext } from '../../../types';
import type { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import type { AIAssistantConversationsDataClient } from '../../../ai_assistant_data_clients/conversations';
import type { AIAssistantDataClient } from '../../../ai_assistant_data_clients';

export type OnLlmResponse = (args: {
  content: string;
  refusal?: string;
  interruptValue?: InterruptValue;
  traceData?: Message['traceData'];
  isError?: boolean;
}) => Promise<void>;

export interface AssistantDataClients {
  anonymizationFieldsDataClient?: AIAssistantDataClient;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
}

export interface AgentExecutorParams<T extends boolean> {
  abortSignal?: AbortSignal;
  assistantContext: ElasticAssistantApiRequestHandlerContext;
  alertsIndexPattern?: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  assistantTools?: AssistantTool[];
  connectorId: string;
  threadId: string;
  conversationId?: string;
  contentReferencesStore: ContentReferencesStore;
  core: CoreRequestHandlerContext;
  dataClients?: AssistantDataClients;
  esClient: ElasticsearchClient;
  langChainMessages: BaseMessage[];
  llmTasks?: LlmTasksPluginStart;
  llmType?: string;
  isOssModel?: boolean;
  inference: InferenceServerStart;
  inferenceChatModelDisabled?: boolean;
  logger: Logger;
  onNewReplacements?: (newReplacements: Replacements) => void;
  replacements: Replacements;
  isStream?: T;
  onLlmResponse?: OnLlmResponse;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  response?: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  screenContext?: ScreenContext;
  size?: number;
  systemPrompt?: string;
  telemetry: AnalyticsServiceSetup;
  telemetryParams?: TelemetryParams;
  traceOptions?: TraceOptions;
  responseLanguage?: string;
  timeout?: number;
}

export interface StaticReturnType {
  body: ResponseBody;
  headers: ResponseHeaders;
}
export type AgentExecutorResponse<T extends boolean> = T extends true
  ? StreamResponseWithHeaders
  : StaticReturnType;

export type AgentExecutor<T extends boolean> = (
  params: AgentExecutorParams<T>
) => Promise<AgentExecutorResponse<T>>;

export interface TraceOptions {
  evaluationId?: string;
  exampleId?: string;
  projectName?: string;
  runName?: string;
  tags?: string[];
  tracers?: LangChainTracer[];
}
