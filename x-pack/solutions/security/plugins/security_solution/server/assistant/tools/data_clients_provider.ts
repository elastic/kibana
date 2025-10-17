/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';

/**
 * Global data clients provider that can be accessed by other tools
 */
class DataClientsProvider {
  private kbDataClient: AIAssistantKnowledgeBaseDataClient | null = null;
  private initialized = false;

  constructor(
    private getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
  ) {}

  async initialize(context: any) {
    if (this.initialized) {
      return;
    }

    try {
      // Access the assistant context directly from the tool context
      // This is the same pattern used in agent_builder_execute.ts
      const assistantContext = context.elasticAssistant;

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
      this.kbDataClient = new AIAssistantKnowledgeBaseDataClient({
        spaceId,
        logger: context.logger,
        elasticsearchClientPromise: Promise.resolve(context.esClient.asInternalUser),
        currentUser,
        kibanaVersion: pluginsStart.elasticAssistant.kibanaVersion,
        indexPatternsResourceName: '.kibana-elastic-ai-assistant-knowledge-base',
        ml: {} as any, // ML plugin not available in start dependencies
        getElserId: () => Promise.resolve('elser-id'),
        elserInferenceId: undefined,
        manageGlobalKnowledgeBaseAIAssistant:
          securitySolutionAssistant.manageGlobalKnowledgeBaseAIAssistant as boolean,
        getTrainedModelsProvider: () => {
          // Fallback implementation since ML plugin is not available in start dependencies
          return {
            getELSER: () => Promise.resolve({ model_id: 'elser-id' }),
          } as any;
        },
        getIsKBSetupInProgress: () => false,
        getProductDocumentationStatus: () => Promise.resolve('installed'),
        ingestPipelineResourceName: '.kibana-elastic-ai-assistant-ingest-pipeline-knowledge-base',
        setIsKBSetupInProgress: () => {},
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
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): DataClientsProvider {
  if (!globalDataClientsProvider) {
    globalDataClientsProvider = new DataClientsProvider(getStartServices);
  }
  return globalDataClientsProvider;
}

export async function initializeDataClients(context: any) {
  if (!globalDataClientsProvider) {
    return;
  }
  await globalDataClientsProvider.initialize(context);
}
