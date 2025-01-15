/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { BaseMessage } from '@langchain/core/messages';
import { Logger } from '@kbn/logging';
import { KibanaRequest, KibanaResponseFactory, ResponseHeaders } from '@kbn/core-http-server';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { ExecuteConnectorRequestBody, Message, Replacements } from '@kbn/elastic-assistant-common';
import { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { TelemetryParams } from '@kbn/langchain/server/tracers/telemetry/telemetry_tracer';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import { ResponseBody } from '../types';
import type { AssistantTool } from '../../../types';
import { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { AIAssistantConversationsDataClient } from '../../../ai_assistant_data_clients/conversations';
import { AIAssistantDataClient } from '../../../ai_assistant_data_clients';

export type OnLlmResponse = (
  content: string,
  traceData?: Message['traceData'],
  isError?: boolean
) => Promise<void>;

export interface AssistantDataClients {
  anonymizationFieldsDataClient?: AIAssistantDataClient;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
}

export interface AgentExecutorParams<T extends boolean> {
  abortSignal?: AbortSignal;
  alertsIndexPattern?: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  assistantTools?: AssistantTool[];
  connectorId: string;
  conversationId?: string;
  dataClients?: AssistantDataClients;
  esClient: ElasticsearchClient;
  langChainMessages: BaseMessage[];
  llmTasks?: LlmTasksPluginStart;
  llmType?: string;
  isOssModel?: boolean;
  inference: InferenceServerStart;
  logger: Logger;
  onNewReplacements?: (newReplacements: Replacements) => void;
  replacements: Replacements;
  isStream?: T;
  onLlmResponse?: OnLlmResponse;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  response?: KibanaResponseFactory;
  size?: number;
  systemPrompt?: string;
  telemetry: AnalyticsServiceSetup;
  telemetryParams?: TelemetryParams;
  traceOptions?: TraceOptions;
  responseLanguage?: string;
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
