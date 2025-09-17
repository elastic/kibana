/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, FakeRawRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { AgentCreateRequest } from '@kbn/onechat-plugin/common/agents';
import {
  DEFAULT_SYSTEM_PROMPT,
  INCLUDE_CITATIONS,
} from '@kbn/elastic-assistant-plugin/server/lib/prompt/prompts';
import {
  getPrompt as localGetPrompt,
  promptDictionary,
} from '@kbn/elastic-assistant-plugin/server/lib/prompt';
import { promptGroupId } from '@kbn/elastic-assistant-plugin/server/lib/prompt/local_prompt_object';
import { getModelOrOss } from '@kbn/elastic-assistant-plugin/server/lib/prompt/helpers';
import { PromptTemplate } from '@langchain/core/prompts';
import type { DocumentEntry } from '@kbn/elastic-assistant-common';
import type { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import { isSupportedConnector } from '@kbn/inference-common';
import type {
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginStartDependencies,
} from '../plugin_contract';

export interface SiemAgentCreatorDeps {
  onechatPlugin: SecuritySolutionPluginStartDependencies['onechat'];
  assistantPlugin: SecuritySolutionPluginStartDependencies['elasticAssistant'];
  core: SecuritySolutionPluginCoreStartDependencies;
  actionsPlugin: SecuritySolutionPluginStartDependencies['actions'];
  logger: Logger;
}

const KNOWLEDGE_HISTORY_PREFIX = 'Knowledge History:';
const NO_KNOWLEDGE_HISTORY = '[No existing knowledge history]';

const formatKnowledgeHistory = <T extends { text: string }>(knowledgeHistory: T[]) => {
  return knowledgeHistory.length
    ? `${KNOWLEDGE_HISTORY_PREFIX}\n${knowledgeHistory.map((e) => e.text).join('\n')}`
    : NO_KNOWLEDGE_HISTORY;
};

export class SiemAgentCreator {
  private readonly deps: SiemAgentCreatorDeps;

  constructor(deps: SiemAgentCreatorDeps) {
    this.deps = deps;
  }

  /**
   * Generates model instructions for all existing connectors using chatPromptFactory logic
   */
  private async generateModelInstructionsForAllConnectors(
    kbClient: AIAssistantKnowledgeBaseDataClient | null
  ): Promise<Record<string, string>> {
    const { core, actionsPlugin, logger } = this.deps;

    try {
      // Get actions client to fetch connectors
      const actionsClient = await actionsPlugin.getUnsecuredActionsClient();
      const savedObjectsClient = core.savedObjects.getUnsafeInternalClient();

      // Get all connectors
      const allConnectors = await actionsClient.getAll('default');

      // Filter to only supported inference connectors
      const supportedConnectors = allConnectors.filter((connector) =>
        isSupportedConnector(connector)
      );

      const modelInstructions: Record<string, string> = {};

      // Generate model instructions for each connector type
      for (const connector of supportedConnectors) {
        try {
          const llmType = this.getLlmTypeFromConnector(connector);
          const isOssModel = this.isOpenSourceModel(connector);

          // Generate base system prompt using the same logic as default_assistant_graph
          const baseSystemPrompt = await localGetPrompt({
            connectorId: connector.id,
            model: getModelOrOss(llmType, isOssModel),
            promptId: promptDictionary.systemPrompt,
            promptGroupId: promptGroupId.aiAssistant,
            provider: llmType,
            savedObjectsClient,
          });

          // Apply chatPromptFactory system prompt logic
          const systemPrompt = await this.generateSystemPromptWithChatPromptFactoryLogic({
            prompt: baseSystemPrompt,
            kbClient,
          });

          if (llmType) {
            modelInstructions[llmType] = systemPrompt;
          } else {
            logger.warn(
              `Failed to generate model instructions for connector ${connector.id}: ${llmType}`
            );
          }

          logger.debug(`Generated model instructions for connector type: ${llmType}`);
        } catch (error) {
          logger.warn(
            `Failed to generate model instructions for connector ${connector.id}: ${error.message}`
          );
        }
      }

      logger.info(
        `Successfully generated model instructions for ${
          Object.keys(modelInstructions).length
        } connector types`
      );
      return modelInstructions;
    } catch (error) {
      logger.error(`Failed to generate model instructions for connectors: ${error.message}`);
      return {};
    }
  }

  /**
   * Generates system prompt using the same logic as chatPromptFactory
   * This extracts the system prompt generation logic from chatPromptFactory (lines 69-79)
   */
  private async generateSystemPromptWithChatPromptFactoryLogic(inputs: {
    prompt: string;
    kbClient: AIAssistantKnowledgeBaseDataClient | null;
  }): Promise<string> {
    const { prompt } = inputs;

    // Get knowledge history if kbClient is available
    const knowledgeHistoryPromise: Promise<DocumentEntry[]> = Promise.resolve([]);

    const knowledgeHistory = await knowledgeHistoryPromise;
    const formattedKnowledgeHistory = formatKnowledgeHistory(knowledgeHistory);

    // Create system prompt template and format it (same logic as chatPromptFactory lines 73-79)
    const systemPromptTemplate = PromptTemplate.fromTemplate(prompt);

    const systemPrompt = await systemPromptTemplate.format({
      citations_prompt: INCLUDE_CITATIONS,
      knowledgeHistory: formattedKnowledgeHistory,
      formattedTime: '',
    });

    return systemPrompt;
  }

  /**
   * Determines the LLM type from a connector
   */
  private getLlmTypeFromConnector(connector: { actionTypeId: string }): string | undefined {
    const actionTypeId = connector.actionTypeId;

    // Map connector types to LLM types
    switch (actionTypeId) {
      case '.gen-ai':
        return 'openai';
      case '.bedrock':
        return 'bedrock';
      case '.gemini':
        return 'gemini';
      default:
        return actionTypeId;
    }
  }

  /**
   * Determines if a connector is an open source model
   */
  private isOpenSourceModel(connector: {
    actionTypeId: string;
    config?: { model?: string };
  }): boolean {
    // This is a simplified check - you may need to adjust based on your specific logic
    const actionTypeId = connector.actionTypeId;
    return actionTypeId === '.gen-ai' && (connector.config?.model?.includes('oss') ?? false);
  }

  async createSiemAgent(): Promise<void> {
    const { onechatPlugin, logger, assistantPlugin } = this.deps;

    try {
      // Create a mock request for internal agent creation with system authentication
      const fakeRawRequest: FakeRawRequest = {
        headers: {
          'kbn-system-request': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
        path: '/internal/security_solution/siem-agent',
      };

      const mockRequest = kibanaRequestFactory(fakeRawRequest);

      const agentClient = await onechatPlugin.agents.getScopedClient({ request: mockRequest });

      // Check if SIEM agent already exists
      const agentExists = await agentClient.has('siem-security-analyst');
      if (agentExists) {
        logger.info('SIEM agent already exists, skipping creation');
        return;
      }

      const kbClient = await assistantPlugin.getKnowledgeBaseDataClient(mockRequest);

      // Generate model instructions for all existing connectors
      logger.info('Generating model instructions for all existing connectors...');
      const modelsInstructions = await this.generateModelInstructionsForAllConnectors(kbClient);

      const siemAgentRequest: AgentCreateRequest = {
        id: 'siem-security-analyst',
        name: 'SIEM Security Analyst',
        description: DEFAULT_SYSTEM_PROMPT,
        labels: ['security', 'siem', 'threat-detection', 'incident-response'],
        avatar_color: '#ff6b6b',
        avatar_symbol: '🛡️',
        configuration: {
          instructions: `${
            modelsInstructions.openai ??
            modelsInstructions.bedrock ??
            modelsInstructions.gemini ??
            ''
          }

CRITICAL INSTRUCTION: You MUST ALWAYS call the fetch-siem-prompts-tool FIRST before executing any other tools. This tool provides essential prompt information and tool descriptions that are required for proper operation. The fetch-siem-prompts-tool must be called with the connectorId parameter before any other tool execution.`,
          tools: [
            // CRITICAL: Include the fetch-siem-prompts-tool FIRST - this must run before all other tools
            { tool_ids: ['fetch-siem-prompts-tool'] },
            // Include the open-and-acknowledged-alerts-internal-tool
            { tool_ids: ['open-and-acknowledged-alerts-internal-tool'] },
            // Include the alert-counts-internal-tool
            { tool_ids: ['alert-counts-internal-tool'] },
            // Include the knowledge-base-retrieval-internal-tool
            { tool_ids: ['knowledge-base-retrieval-internal-tool'] },
            // Include the product-documentation-internal-tool
            { tool_ids: ['product-documentation-internal-tool'] },
            // Include the security-labs-knowledge-internal-tool
            { tool_ids: ['security-labs-knowledge-internal-tool'] },
            // Include the knowledge-base-write-internal-tool
            { tool_ids: ['knowledge-base-write-internal-tool'] },
            // Include the entity-risk-score-tool-internal
            { tool_ids: ['entity-risk-score-tool-internal'] },
            // Include all built-in tools for comprehensive security analysis
            { tool_ids: ['*'] },
          ],
        },
      };

      logger.debug(`siemAgentRequest: ${JSON.stringify(siemAgentRequest)}`);
      const createdAgent = await agentClient.create(siemAgentRequest);
      logger.info(`Successfully created SIEM agent '${createdAgent.name}' (${createdAgent.id})`);
    } catch (error) {
      logger.error('Failed to create SIEM agent', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

/**
 * Factory function to create a SIEM agent creator instance
 */
export const createSiemAgentCreator = (deps: SiemAgentCreatorDeps): SiemAgentCreator => {
  return new SiemAgentCreator(deps);
};
