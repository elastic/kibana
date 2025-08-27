/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { z } from '@kbn/zod';
import { HumanMessage } from '@langchain/core/messages';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { APP_UI_ID } from '../../../../common';
import { getPromptSuffixForOssModel } from './utils/common';
import { getGenerateEsqlGraph } from './graphs/generate_esql/generate_esql';

export type GenerateAssetEsqlParams = Require<
  AssistantToolParams,
  'assistantContext' | 'createLlmInstance'
>;

const TOOL_NAME = 'GenerateAssetESQLTool';

// Asset-specific query templates for common security investigations
const buildAssetContext = (entityId: string, queryType: string): string => {
  const assetConstraints = `host.id == "${entityId}" OR host.name == "${entityId}" OR entity.id == "${entityId}" OR user.name == "${entityId}" OR service.name == "${entityId}"`;

  switch (queryType.toLowerCase()) {
    case 'recent_activity':
      return `Generate an ES|QL query to find all recent activity (last 7 days) for the asset with identifier "${entityId}". 
      The query should:
      - Search in logs-* indices
      - Filter by asset identifiers: ${assetConstraints}
      - Include last 7 days of data
      - Show relevant fields: @timestamp, event.action, event.category, user.name, process.name, source.ip, destination.ip, file.name, network.protocol
      - Sort by timestamp descending
      - Limit to 100 results`;

    case 'login_attempts':
      return `Generate an ES|QL query to find all login attempts for the asset "${entityId}".
      The query should:
      - Search in authentication logs
      - Filter by asset: ${assetConstraints}
      - Show login events (event.action like "login", "logon", "authentication")
      - Include fields: @timestamp, user.name, source.ip, event.outcome, event.action
      - Show both successful and failed attempts`;

    case 'network_connections':
      return `Generate an ES|QL query to find network connections for the asset "${entityId}".
      The query should:
      - Search in network logs
      - Filter by asset: ${assetConstraints}
      - Show network events
      - Include fields: @timestamp, source.ip, destination.ip, network.protocol, network.bytes`;

    case 'process_execution':
      return `Generate an ES|QL query to find process executions on the asset "${entityId}".
      The query should:
      - Search in process logs
      - Filter by asset: ${assetConstraints}
      - Show process creation events
      - Include fields: @timestamp, process.name, process.command_line, user.name, process.parent.name`;

    case 'file_access':
      return `Generate an ES|QL query to find file access events for the asset "${entityId}".
      The query should:
      - Search in file system logs
      - Filter by asset: ${assetConstraints}
      - Show file access events
      - Include fields: @timestamp, file.name, file.path, user.name, event.action`;

    default:
      return `Generate an ES|QL query for the asset "${entityId}" to: ${queryType}.
      Make sure to filter by the asset identifiers: ${assetConstraints}`;
  }
};

const toolDetails = {
  id: 'generate-asset-esql-tool',
  name: TOOL_NAME,
  description: `You MUST use the "${TOOL_NAME}" function when the user wants to:
  - generate ES|QL queries for a specific asset or entity
  - investigate security events for a particular host, user, or service
  - create queries that filter by asset identifiers (host.id, host.name, entity.id, user.name, service.name)
  
  This tool extends ES|QL generation with asset-specific context and common security investigation patterns.`,
};

export const GENERATE_ASSET_ESQL_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is GenerateAssetEsqlParams => {
    const { inference, connectorId, assistantContext, createLlmInstance } = params;
    return (
      inference != null &&
      connectorId != null &&
      assistantContext != null &&
      createLlmInstance != null
    );
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { connectorId, inference, logger, request, isOssModel, esClient, createLlmInstance } =
      params as GenerateAssetEsqlParams;

    if (inference == null || connectorId == null) return null;

    const selfHealingGraph = await getGenerateEsqlGraph({
      esClient,
      connectorId,
      inference,
      logger,
      request,
      createLlmInstance,
    });

    return tool(
      async ({ entityId, queryType, customRequest }) => {
        // Build asset-specific context
        const question = customRequest || buildAssetContext(entityId, queryType);

        logger?.debug(
          `🔍 Generating asset ES|QL query for entity: ${entityId}, type: ${queryType}`
        );

        const result = await selfHealingGraph.invoke(
          {
            messages: [new HumanMessage({ content: question })],
            input: { question },
          },
          { recursionLimit: 30 }
        );

        const { messages } = result;
        const lastMessage = messages[messages.length - 1];

        logger?.debug('🔍 Generated asset ES|QL query successfully');
        return lastMessage.content;
      },
      {
        name: toolDetails.name,
        description:
          (params.description || toolDetails.description) +
          (isOssModel ? getPromptSuffixForOssModel(TOOL_NAME) : ''),
        schema: z.object({
          entityId: z
            .string()
            .describe(
              'The asset identifier (host name, entity ID, user name, etc.) to generate queries for'
            ),
          queryType: z
            .string()
            .describe(
              'Type of investigation query: recent_activity, login_attempts, network_connections, process_execution, file_access, or custom description'
            ),
          customRequest: z
            .string()
            .optional()
            .describe('Custom ES|QL query request. If provided, overrides the queryType template'),
        }),
        tags: ['esql', 'query-generation', 'asset-investigation', 'security'],
      }
    );
  },
};
