/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getPrompt } from '@kbn/security-ai-prompts';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import {
  localInternalToolPrompts,
  promptGroupId as securityToolsPromptGroupId,
} from '@kbn/elastic-assistant-plugin/server/lib/prompt/internal_tool_prompts';
import type { KibanaRequest, StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

const fetchSiemPromptsSchema = z.object({
  connectorId: z.string().min(1).describe('The connector ID to fetch prompts for'),
});

export const FETCH_SIEM_PROMPTS_TOOL_ID = 'fetch-siem-prompts-tool';

export const FETCH_SIEM_PROMPTS_TOOL_DESCRIPTION = `CRITICAL: This tool MUST be called FIRST before any other tools when working with the siem-security-analyst agent. It fetches and provides the available prompts, tool descriptions, and agent configuration for the SIEM Security Analyst agent based on the provided connector ID. This tool ensures that the agent has access to the correct prompts, tool descriptions, and agent tools configuration before executing any other operations.`;

/**
 * Fetches the SIEM Security Analyst agent and extracts its tool configuration
 */
const fetchSiemAgentTools = async (
  request: KibanaRequest,
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): Promise<{ agentTools: string[] }> => {
  try {
    // Get access to the onechat plugin through start services
    const [, startPlugins] = await getStartServices();

    // Get the agent client
    const agentClient = await startPlugins.onechat.agents.getScopedClient({ request });

    // Fetch the siem-security-analyst agent
    const agent = await agentClient.get('siem-security-analyst');

    // Extract tool IDs from the agent configuration
    const agentTools =
      agent.configuration?.tools
        ?.map((tool) => {
          if (typeof tool === 'object' && 'tool_ids' in tool) {
            return tool.tool_ids;
          }
          return [];
        })
        .flat() || [];

    return { agentTools };
  } catch (error) {
    return { agentTools: [] };
  }
};

/**
 * Factory function that returns the fetchSiemPromptsTool with proper dependencies
 */
export const createFetchSiemPromptsTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof fetchSiemPromptsSchema> => {
  return fetchSiemPromptsTool(getStartServices);
};

export const fetchSiemPromptsTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof fetchSiemPromptsSchema> => {
  return {
    id: FETCH_SIEM_PROMPTS_TOOL_ID,
    description: FETCH_SIEM_PROMPTS_TOOL_DESCRIPTION,
    schema: fetchSiemPromptsSchema,
    handler: async ({ connectorId }, { logger, request, toolProvider }) => {
      try {
        // Get access to the elastic-assistant plugin through start services
        const [coreStart, startPlugins] = await getStartServices();

        // Get the scoped clients
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const actionsClient = await (
          startPlugins as {
            actions: {
              getActionsClientWithRequest: (
                req: unknown
              ) => Promise<PublicMethodsOf<ActionsClient>>;
            };
          }
        ).actions.getActionsClientWithRequest(request);

        // Fetch SIEM agent tools and configuration
        logger.info('Fetching SIEM agent tools and configuration...');
        const { agentTools } = await fetchSiemAgentTools(request, getStartServices);
        console.log('connectorId', connectorId);

        // Fetch prompts for the siem-security-analyst agent using getPrompt
        const toolDescriptions: Record<string, string> = {};

        for (const toolId of agentTools) {
          try {
            const prompt = await getPrompt({
              actionsClient,
              localPrompts: localInternalToolPrompts,
              promptGroupId: securityToolsPromptGroupId,
              promptId: toolId,
              savedObjectsClient,
            });

            // Create a description based on the prompt content
            toolDescriptions[toolId] = prompt;
          } catch (error) {
            logger.warn(`Failed to fetch prompt for ${toolId}: ${error.message}`);
          }
        }
        logger.info(`Tool descriptions: ${JSON.stringify(toolDescriptions)}`);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                toolDescriptions,
              },
            },
          ],
        };
      } catch (error) {
        logger.error('Error in fetch SIEM prompts tool:', error);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error fetching SIEM prompts: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['siem', 'prompts', 'security-analyst', 'prerequisite', 'agent-tools'],
  };
};
