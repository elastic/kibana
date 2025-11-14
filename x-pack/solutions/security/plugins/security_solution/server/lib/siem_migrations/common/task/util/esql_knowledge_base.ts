/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { InferenceClient, ToolDefinitions } from '@kbn/inference-common';
import type { ToolsServiceStart } from '@kbn/onechat-plugin/server';
import zodToJsonSchema from 'zod-to-json-schema';
import { lastValueFrom } from 'rxjs';
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';

// Tool IDs that are relevant for SIEM migrations ES|QL generation
const SIEM_MIGRATION_RELEVANT_TOOL_IDS = [
  'platform_core.index_explorer',
  'platform_core.get_index_mapping',
  'platform_core.generate_esql',
];

export class EsqlKnowledgeBase {
  constructor(
    private readonly connectorId: string,
    private readonly migrationId: string,
    private readonly client: InferenceClient,
    private readonly logger: Logger,
    private readonly toolsService?: ToolsServiceStart,
    private readonly request?: KibanaRequest
  ) {}

  /**
   * Retrieves tool definitions from ToolsService and converts them to the format
   * expected by the inference plugin's naturalLanguageToEsql function.
   */
  private async getToolDefinitions(): Promise<ToolDefinitions | undefined> {
    if (!this.toolsService || !this.request) {
      return undefined;
    }

    try {
      const toolRegistry = await this.toolsService.getRegistry({ request: this.request });
      const allTools = await toolRegistry.list({});

      // Filter to only relevant tools for SIEM migrations
      const relevantTools = allTools.filter((tool) =>
        SIEM_MIGRATION_RELEVANT_TOOL_IDS.includes(tool.id)
      );

      if (relevantTools.length === 0) {
        this.logger.debug('No relevant tools found for ES|QL knowledge base');
        return undefined;
      }

      const toolDefinitions: ToolDefinitions = {};

      for (const tool of relevantTools) {
        try {
          // Get the Zod schema from the tool
          const zodSchema = await tool.getSchema();

          // Convert Zod schema to JSON Schema compatible with ToolSchema
          const jsonSchema = zodToJsonSchema(zodSchema, {
            target: 'jsonSchema7',
            $refStrategy: 'none',
          });

          // Extract properties and required fields from the JSON Schema
          const properties = (jsonSchema as Record<string, unknown>).properties || {};
          const required = (jsonSchema as Record<string, unknown>).required || [];

          toolDefinitions[tool.id] = {
            description: tool.description || `Tool: ${tool.id}`,
            schema: {
              type: 'object',
              properties,
              required,
            },
          };
        } catch (error) {
          this.logger.warn(`Failed to convert schema for tool ${tool.id}: ${error.message}`);
          // Continue with other tools even if one fails
        }
      }

      this.logger.debug(
        `Loaded ${
          Object.keys(toolDefinitions).length
        } tool definitions for ES|QL knowledge base: ${Object.keys(toolDefinitions).join(', ')}`
      );

      return Object.keys(toolDefinitions).length > 0 ? toolDefinitions : undefined;
    } catch (error) {
      this.logger.error(`Failed to retrieve tools from ToolsService: ${error.message}`);
      return undefined;
    }
  }

  public async translate(input: string): Promise<string> {
    const tools = await this.getToolDefinitions();

    const { content } = await lastValueFrom(
      naturalLanguageToEsql({
        client: this.client,
        connectorId: this.connectorId,
        input,
        logger: this.logger,
        tools,
        metadata: {
          connectorTelemetry: {
            pluginId: TELEMETRY_SIEM_MIGRATION_ID,
            aggregateBy: this.migrationId,
          },
        },
      })
    );
    return content;
  }
}
