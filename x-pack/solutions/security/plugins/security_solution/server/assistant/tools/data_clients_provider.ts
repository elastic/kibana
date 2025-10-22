/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  StartServicesAccessor,
  Logger,
  KibanaRequest,
  ElasticsearchClient,
} from '@kbn/core/server';
import { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { createGetElserId } from '@kbn/elastic-assistant-plugin/server/ai_assistant_service/helpers';
import { getResourceName } from '@kbn/elastic-assistant-plugin/server/ai_assistant_service';
import type { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';

/**
 * Global data clients provider that can be accessed by other tools
 */
class DataClientsProvider {
  private kbDataClient: AIAssistantKnowledgeBaseDataClient | null = null;
  private initialized = false;
  private isKBSetupInProgress: Map<string, boolean> = new Map();
  private isProductDocumentationInProgress: boolean = false;
  private productDocManager?: ProductDocBaseStartContract['management'];

  constructor(
    private getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
    private mlPlugin?: MlPluginSetup
  ) {}

  public getIsKBSetupInProgress(spaceId: string): boolean {
    return this.isKBSetupInProgress.get(spaceId) ?? false;
  }

  public setIsKBSetupInProgress(spaceId: string, isInProgress: boolean): void {
    this.isKBSetupInProgress.set(spaceId, isInProgress);
  }

  public getIsProductDocumentationInProgress(): boolean {
    return this.isProductDocumentationInProgress;
  }

  public setIsProductDocumentationInProgress(isInProgress: boolean): void {
    this.isProductDocumentationInProgress = isInProgress;
  }

  public async getProductDocumentationStatus(): Promise<InstallationStatus> {
    // If we have access to the product documentation manager, use it
    if (this.productDocManager) {
      const status = await this.productDocManager.getStatus({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      if (!status) {
        return 'uninstalled';
      }

      return this.isProductDocumentationInProgress ? 'installing' : status.status;
    }

    // Fallback: assume installed if we can't check (elasticAssistant service handles this)
    return 'installed';
  }

  async initialize(context: {
    logger: Logger;
    request: KibanaRequest;
    esClient: { asInternalUser: ElasticsearchClient };
    elasticAssistant?: unknown;
  }) {
    if (this.initialized) {
      return;
    }

    try {
      // Access the assistant context directly from the tool context
      // This is the same pattern used in agent_builder_execute.ts
      const assistantContext = context.elasticAssistant as {
        getAIAssistantKnowledgeBaseDataClient?: () => Promise<AIAssistantKnowledgeBaseDataClient | null>;
      };

      if (
        assistantContext &&
        typeof assistantContext.getAIAssistantKnowledgeBaseDataClient === 'function'
      ) {
        this.kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
        this.initialized = true;
        return;
      }

      // Fallback: create manually if assistant context is not available

      const [coreStart, pluginsStart] = await this.getStartServices();

      // Note: Product documentation manager is not directly accessible from security solution
      // The elasticAssistant service handles product documentation internally

      // Get current user and space info from plugins (same pattern as assistant_settings tool)
      const spaceId = pluginsStart.spaces?.spacesService?.getSpaceId(context.request) || 'default';
      const currentUser = await pluginsStart.security.authc.getCurrentUser(context.request);

      if (!currentUser) {
        return;
      }

      // Get capabilities
      const { securitySolutionAssistant } = await coreStart.capabilities.resolveCapabilities(
        context.request,
        {
          capabilityPath: 'securitySolutionAssistant.*',
        }
      );

      // Create KB data client directly (same pattern as assistant_settings tool)
      // Use real resource names (same as elastic_assistant service)
      const resourceNames = {
        aliases: { knowledgeBase: getResourceName('knowledge-base') },
        pipelines: { knowledgeBase: getResourceName('ingest-pipeline-knowledge-base') },
      };

      // Create real getElserId function if ML plugin is available
      const getElserId = this.mlPlugin
        ? createGetElserId(this.mlPlugin.trainedModelsProvider)
        : () => Promise.resolve('elser-id');

      // Create real trained models provider if ML plugin is available
      const getTrainedModelsProvider = this.mlPlugin
        ? () =>
            this.mlPlugin?.trainedModelsProvider(
              {} as KibanaRequest,
              coreStart.savedObjects.createInternalRepository()
            )
        : () =>
            ({
              getELSER: () => Promise.resolve({ model_id: 'elser-id' }),
            } as any);

      this.kbDataClient = new AIAssistantKnowledgeBaseDataClient({
        spaceId,
        logger: context.logger,
        elasticsearchClientPromise: Promise.resolve(context.esClient.asInternalUser),
        currentUser,
        kibanaVersion: pluginsStart.elasticAssistant.kibanaVersion,
        indexPatternsResourceName: resourceNames.aliases.knowledgeBase,
        ml: this.mlPlugin || ({} as MlPluginSetup),
        getElserId,
        elserInferenceId: undefined,
        manageGlobalKnowledgeBaseAIAssistant:
          securitySolutionAssistant.manageGlobalKnowledgeBaseAIAssistant as boolean,
        getTrainedModelsProvider,
        getIsKBSetupInProgress: this.getIsKBSetupInProgress.bind(this),
        getProductDocumentationStatus: this.getProductDocumentationStatus.bind(this),
        ingestPipelineResourceName: resourceNames.pipelines.knowledgeBase,
        setIsKBSetupInProgress: this.setIsKBSetupInProgress.bind(this),
      });

      this.initialized = true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DATA_CLIENTS_PROVIDER] Failed to initialize data clients:', error);
    }
  }

  getKnowledgeBaseDataClient(): AIAssistantKnowledgeBaseDataClient | null {
    return this.kbDataClient;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Global instance
let globalDataClientsProvider: DataClientsProvider | null = null;

export function getDataClientsProvider(
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  mlPlugin?: MlPluginSetup
): DataClientsProvider {
  if (!globalDataClientsProvider) {
    globalDataClientsProvider = new DataClientsProvider(getStartServices, mlPlugin);
  }
  return globalDataClientsProvider;
}

export async function initializeDataClients(context: {
  logger: Logger;
  request: KibanaRequest;
  esClient: { asInternalUser: ElasticsearchClient };
  elasticAssistant?: unknown;
}) {
  if (!globalDataClientsProvider) {
    return;
  }
  await globalDataClientsProvider.initialize(context);
}
