/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { transformESSearchToAnonymizationFields } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/anonymization_fields/helpers';
import type { EsAnonymizationFieldsSchema } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/anonymization_fields/types';
import { AIAssistantDataClient } from '@kbn/elastic-assistant-plugin/server';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// Extended request type to access request body
interface ExtendedKibanaRequest {
  body?: {
    alertsIndexPattern?: string;
    size?: number;
  };
}

// Helper function to create user-friendly settings display
const createUserFriendlySettings = (settings: Record<string, unknown>, toolId: string) => {
  const userFriendly: Record<string, unknown> = {};

  // Always include alertsIndexPattern if present
  if (settings.alertsIndexPattern) {
    userFriendly.alertsIndexPattern = settings.alertsIndexPattern;
  }

  // Always include size if present
  if (settings.size) {
    userFriendly.size = settings.size;
  }

  // Handle anonymization fields - show only field names being anonymized
  if (settings.anonymizationFields && Array.isArray(settings.anonymizationFields)) {
    const anonymizedFields = settings.anonymizationFields
      .filter((field: Record<string, unknown>) => field.anonymized === true)
      .map((field: Record<string, unknown>) => field.field);

    if (anonymizedFields.length > 0) {
      userFriendly.anonymizedFields = anonymizedFields;
    }
  }

  return userFriendly;
};

// Schema to specify which tool settings to retrieve
const assistantSettingsToolSchema = z.object({
  toolId: z
    .string()
    .describe(
      'The ID of the tool that needs settings (e.g., "core.security.alert_counts", "core.security.open_and_acknowledged_alerts")'
    ),
});

const ASSISTANT_SETTINGS_INTERNAL_TOOL_ID = 'core.security.assistant_settings';
export const ASSISTANT_SETTINGS_INTERNAL_TOOL_DESCRIPTION =
  'Call this tool to retrieve current assistant settings for a specific tool. Use this when you need to get configuration parameters for a specific tool before calling it. ' +
  'This tool requires a toolId parameter specifying which tool you need settings for. It provides only the relevant configuration for that specific tool. ' +
  'The tool dynamically fetches the current settings from the request and data client. ' +
  'WORKFLOW: After calling this tool, use the retrieved settings to call the tool specified in toolId.';

/**
 * Returns a tool for retrieving assistant settings using the InternalToolDefinition pattern.
 * This tool provides access to assistant configuration that other tools can use.
 */
export const assistantSettingsInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof assistantSettingsToolSchema> => {
  return {
    id: ASSISTANT_SETTINGS_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: ASSISTANT_SETTINGS_INTERNAL_TOOL_DESCRIPTION,
    schema: assistantSettingsToolSchema,
    handler: async ({ toolId }, context) => {
      try {
        // Get real anonymization fields from the data client
        let anonymizationFields: Array<{
          id: string;
          field: string;
          allowed: boolean;
          anonymized: boolean;
          timestamp: string;
          createdAt: string;
          updatedAt?: string;
          namespace: string;
        }> = [];

        try {
          // Get access to start services
          const [, pluginsStart] = await getStartServices();

          // Get space ID from request
          const spaceId =
            pluginsStart.spaces?.spacesService?.getSpaceId(context.request) || 'default';

          // Get current user
          const currentUser = await pluginsStart.security.authc.getCurrentUser(context.request);

          // Create the data client directly (bypassing licensing check)
          const dataClient = new AIAssistantDataClient({
            logger: context.logger,
            elasticsearchClientPromise: Promise.resolve(context.esClient.asInternalUser),
            spaceId,
            kibanaVersion: pluginsStart.elasticAssistant.kibanaVersion,
            indexPatternsResourceName:
              pluginsStart.elasticAssistant.getAnonymizationFieldsResourceName(),
            currentUser,
          });

          // Query anonymization fields
          const anonymizationFieldsRes =
            await dataClient.findDocuments<EsAnonymizationFieldsSchema>({
              perPage: 1000,
              page: 1,
            });

          if (anonymizationFieldsRes) {
            const transformedFields = transformESSearchToAnonymizationFields(
              anonymizationFieldsRes.data
            );
            anonymizationFields = transformedFields.map((field) => ({
              id: field.id,
              field: field.field,
              allowed: field.allowed ?? false,
              anonymized: field.anonymized ?? false,
              timestamp: field.timestamp ?? new Date().toISOString(),
              createdAt: field.createdAt ?? new Date().toISOString(),
              updatedAt: field.updatedAt,
              namespace: field.namespace ?? 'default',
            }));
          }
        } catch (error) {
          // If we can't fetch real anonymization fields, fall back to defaults
          anonymizationFields = [
            {
              id: 'host-name',
              field: 'host.name',
              allowed: true,
              anonymized: true,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              namespace: 'default',
            },
            {
              id: 'user-name',
              field: 'user.name',
              allowed: true,
              anonymized: true,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              namespace: 'default',
            },
            {
              id: 'source-ip',
              field: 'source.ip',
              allowed: true,
              anonymized: true,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              namespace: 'default',
            },
            {
              id: 'destination-ip',
              field: 'destination.ip',
              allowed: true,
              anonymized: true,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              namespace: 'default',
            },
          ];
        }

        // Get configuration from request body (same as langChainExecute)
        const requestBody = (context.request as ExtendedKibanaRequest).body;
        const alertsIndexPattern =
          requestBody?.alertsIndexPattern || '.alerts-security.alerts-default';
        const size = requestBody?.size || 100;

        // Return settings specific to the requested tool
        let toolSpecificSettings: Record<string, unknown> = {};

        switch (toolId) {
          case 'core.security.alert_counts':
            toolSpecificSettings = {
              alertsIndexPattern,
            };
            break;
          case 'core.security.open_and_acknowledged_alerts':
            toolSpecificSettings = {
              alertsIndexPattern,
              size,
              anonymizationFields,
            };
            break;
          case 'core.security.entity_risk_score':
            toolSpecificSettings = {
              alertsIndexPattern,
              anonymizationFields,
            };
            break;
          default:
            // For unknown tools, return basic settings
            toolSpecificSettings = {
              alertsIndexPattern,
              anonymizationFields,
            };
        }

        // Create user-friendly settings display
        const userFriendlySettings = createUserFriendlySettings(toolSpecificSettings, toolId);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Current settings retrieved successfully. Please confirm these settings before proceeding:`,
                settings: userFriendlySettings,
                guidance: `These are the current settings for your analysis. Please confirm if these settings are correct. I will wait for your explicit confirmation before proceeding with your original question using these settings.`,
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: 'Failed to retrieve assistant settings',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            },
          ],
        };
      }
    },
    tags: ['assistant-settings', 'configuration', 'security'],
  };
};
