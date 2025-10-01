/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  AuthenticatedUser,
  CoreRequestHandlerContext,
  CoreSetup,
  AnalyticsServiceSetup,
  CustomRequestHandlerContext,
  ElasticsearchClient,
  IRouter,
  KibanaRequest,
  Logger,
  AuditLogger,
  SavedObjectsClientContract,
  UserProfileServiceStart,
} from '@kbn/core/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import { type MlPluginSetup } from '@kbn/ml-plugin/server';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type {
  AttackDiscoveryPostInternalRequestBody,
  DefendInsightsPostRequestBody,
  AssistantFeatures,
  ExecuteConnectorRequestBody,
  Replacements,
  ContentReferencesStore,
} from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import type {
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
  ActionsClientGeminiChatModel,
  ActionsClientChatBedrockConverse,
  ActionsClientLlm,
} from '@kbn/langchain/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { IEventLogger, IEventLogService } from '@kbn/event-log-plugin/server';
import type { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import type { CheckPrivileges, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type {
  GetAIAssistantKnowledgeBaseDataClientParams,
  AIAssistantKnowledgeBaseDataClient,
} from './ai_assistant_data_clients/knowledge_base';
import type { AttackDiscoveryDataClient } from './lib/attack_discovery/persistence';
import type {
  AIAssistantConversationsDataClient,
  GetAIAssistantConversationsDataClientParams,
} from './ai_assistant_data_clients/conversations';
import type { GetRegisteredFeatures, GetRegisteredTools } from './services/app_context';
import { CallbackIds } from './services/app_context';
import type { AIAssistantDataClient } from './ai_assistant_data_clients';
import type { DefendInsightsDataClient } from './lib/defend_insights/persistence';
import type { AttackDiscoveryScheduleDataClient } from './lib/attack_discovery/schedules/data_client';

export const PLUGIN_ID = 'elasticAssistant' as const;
export { CallbackIds };

/** The plugin setup interface */
export interface ElasticAssistantPluginSetup {
  actions: ActionsPluginSetup;
}

/** The plugin start interface */
export interface ElasticAssistantPluginStart {
  /**
   * Actions plugin start contract.
   */
  actions: ActionsPluginStart;
  /**
   * Inference plugin start contract.
   */
  inference: InferenceServerStart;
  /**
   * Register features to be used by the elastic assistant.
   *
   * Note: Be sure to use the pluginName that is sent in the request headers by your plugin to ensure it is extracted
   * and the correct features are available. See {@link getPluginNameFromRequest} for more details.
   *
   * @param pluginName Name of the plugin the features should be registered to
   * @param features Partial<AssistantFeatures> to be registered with for the given plugin
   */
  registerFeatures: (pluginName: string, features: Partial<AssistantFeatures>) => void;
  /**
   * Get the registered features for a given plugin name.
   * @param pluginName Name of the plugin to get the features for
   */
  getRegisteredFeatures: GetRegisteredFeatures;
  /**
   * Register tools to be used by the elastic assistant.
   *
   * Note: Be sure to use the pluginName that is sent in the request headers by your plugin to ensure it is extracted
   * and the correct tools are selected. See {@link getPluginNameFromRequest} for more details.
   *
   * @param pluginName Name of the plugin the tool should be registered to
   * @param tools AssistantTools to be registered with for the given plugin
   */
  registerTools: (pluginName: string, tools: AssistantTool[]) => void;
  /**
   * Get the registered tools for a given plugin name.
   * @param pluginName Name of the plugin to get the tools for
   */
  getRegisteredTools: GetRegisteredTools;
  /**
   * Register a callback to be used by the elastic assistant.
   * @param callbackId
   * @param callback
   */
  registerCallback: (callbackId: CallbackIds, callback: Function) => void;
}

export interface ElasticAssistantPluginSetupDependencies {
  actions: ActionsPluginSetup;
  alerting: AlertingServerSetup;
  eventLog: IEventLogService; // for writing to the event log
  ml: MlPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  taskManager: TaskManagerSetupContract;
  spaces?: SpacesPluginSetup;
}
export interface ElasticAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
  alerting: AlertingServerStart;
  llmTasks: LlmTasksPluginStart;
  inference: InferenceServerStart;
  spaces?: SpacesPluginStart;
  licensing: LicensingPluginStart;
  productDocBase: ProductDocBaseStartContract;
  security: SecurityPluginStart;
}

export interface ElasticAssistantApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  actions: ActionsPluginStart;
  auditLogger?: AuditLogger;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  getRegisteredFeatures: GetRegisteredFeatures;
  getRegisteredTools: GetRegisteredTools;
  logger: Logger;
  getServerBasePath: () => string;
  getSpaceId: () => string;
  getCurrentUser: () => Promise<AuthenticatedUser | null>;
  getAIAssistantConversationsDataClient: (
    params?: GetAIAssistantConversationsDataClientParams
  ) => Promise<AIAssistantConversationsDataClient | null>;
  getAIAssistantKnowledgeBaseDataClient: (
    params?: GetAIAssistantKnowledgeBaseDataClientParams
  ) => Promise<AIAssistantKnowledgeBaseDataClient | null>;
  getAttackDiscoveryDataClient: () => Promise<AttackDiscoveryDataClient | null>;
  getAttackDiscoverySchedulingDataClient: () => Promise<AttackDiscoveryScheduleDataClient | null>;
  getDefendInsightsDataClient: () => Promise<DefendInsightsDataClient | null>;
  getAIAssistantPromptsDataClient: () => Promise<AIAssistantDataClient | null>;
  getAlertSummaryDataClient: () => Promise<AIAssistantDataClient | null>;
  getAIAssistantAnonymizationFieldsDataClient: () => Promise<AIAssistantDataClient | null>;
  getCheckpointSaver: () => Promise<BaseCheckpointSaver | null>;
  llmTasks: LlmTasksPluginStart;
  inference: InferenceServerStart;
  savedObjectsClient: SavedObjectsClientContract;
  telemetry: AnalyticsServiceSetup;
  checkPrivileges: () => CheckPrivileges;
  userProfile: UserProfileServiceStart;
}
/**
 * @internal
 */
export type ElasticAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  elasticAssistant: ElasticAssistantApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type ElasticAssistantPluginRouter = IRouter<ElasticAssistantRequestHandlerContext>;

export type ElasticAssistantPluginCoreSetupDependencies = CoreSetup<
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantPluginStart
>;

export type GetElser = () => Promise<string> | never;

export interface AssistantResourceNames {
  componentTemplate: {
    alertSummary: string;
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    defendInsights: string;
    checkpoints: string;
    checkpointWrites: string;
  };
  indexTemplate: {
    alertSummary: string;
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    defendInsights: string;
    checkpoints: string;
    checkpointWrites: string;
  };
  aliases: {
    alertSummary: string;
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    defendInsights: string;
    checkpoints: string;
    checkpointWrites: string;
  };
  indexPatterns: {
    alertSummary: string;
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    defendInsights: string;
    checkpoints: string;
    checkpointWrites: string;
  };
  pipelines: {
    knowledgeBase: string;
  };
}

export interface IIndexPatternString {
  pattern: string;
  alias: string;
  name: string;
  basePattern: string;
  validPrefixes?: string[];
  secondaryAlias?: string;
}

/**
 * Interfaces for registering tools to be used by the elastic assistant
 */

export interface AssistantTool {
  id: string;
  name: string;
  description: string;
  sourceRegister: string;
  isSupported: (params: AssistantToolParams) => boolean;
  getTool: (params: AssistantToolParams) => Promise<StructuredToolInterface | null>;
}

export type AssistantToolLlm =
  | ActionsClientChatBedrockConverse
  | ActionsClientChatOpenAI
  | ActionsClientGeminiChatModel
  | ActionsClientChatVertexAI
  | InferenceChatModel;

export interface AssistantToolParams {
  alertsIndexPattern?: string;
  assistantContext?: ElasticAssistantApiRequestHandlerContext;
  anonymizationFields?: AnonymizationFieldResponse[];
  inference?: InferenceServerStart;
  isEnabledKnowledgeBase: boolean;
  connectorId?: string;
  contentReferencesStore: ContentReferencesStore;
  description?: string;
  esClient: ElasticsearchClient;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
  langChainTimeout?: number;
  llm?: ActionsClientLlm | AssistantToolLlm;
  llmTasks?: LlmTasksPluginStart;
  isOssModel?: boolean;
  logger: Logger;
  onNewReplacements?: (newReplacements: Replacements) => void;
  replacements?: Replacements;
  request: KibanaRequest<
    unknown,
    unknown,
    | ExecuteConnectorRequestBody
    | AttackDiscoveryPostInternalRequestBody
    | DefendInsightsPostRequestBody
  >;
  size?: number;
  telemetry?: AnalyticsServiceSetup;
  createLlmInstance?: () => Promise<AssistantToolLlm>;
}

/**
 * Helper type for working with AssistantToolParams when some properties are required.
 *
 *
 * ```ts
 * export type MyNewTypeWithAssistantContext = Require<AssistantToolParams, 'assistantContext'>
 * ```
 */

export type Require<T extends object, P extends keyof T> = Omit<T, P> & Required<Pick<T, P>>;
