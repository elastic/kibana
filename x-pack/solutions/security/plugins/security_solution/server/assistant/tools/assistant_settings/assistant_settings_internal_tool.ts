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
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// Extended request type to access request body
interface ExtendedKibanaRequest {
  body?: {
    alertsIndexPattern?: string;
    size?: number;
  };
}

// Empty schema for A2A compatibility - no parameters needed
const assistantSettingsToolSchema = z.object({});

const ASSISTANT_SETTINGS_INTERNAL_TOOL_ID = 'core.security.assistant_settings';
export const ASSISTANT_SETTINGS_INTERNAL_TOOL_DESCRIPTION =
  'Call this tool to retrieve current assistant settings including anonymization fields, default index patterns, and other configuration. Use this when other tools need to know the current assistant configuration. ' +
  'This tool requires NO parameters. It provides real-time configuration that should be confirmed with the user ONCE before proceeding. ' +
  'The tool dynamically fetches the current alertsIndexPattern from the request, size defaults, and real anonymization fields from the data client. ' +
  'IMPORTANT: Ask the user to confirm these settings ONCE, then proceed immediately to call the appropriate tool. Do not ask for confirmation multiple times. ' +
  'CRITICAL: After user confirms, IMMEDIATELY call the next tool to answer their original question. Do NOT ask for more information.';

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
    handler: async (params, context) => {
      try {
        // Get access to the elastic-assistant plugin through start services
        const [, pluginsStart] = await getStartServices();

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
          // Access the real anonymization fields from the data client
          const anonymizationFieldsDataClient =
            await pluginsStart.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient(
              context.request
            );

          if (anonymizationFieldsDataClient) {
            const anonymizationFieldsRes =
              await anonymizationFieldsDataClient.findDocuments<EsAnonymizationFieldsSchema>({
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

        // Return comprehensive assistant settings with real configuration
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'Assistant settings retrieved successfully. Please confirm these settings before proceeding:',
                settings: {
                  anonymizationFields,
                  defaults: {
                    openAndAcknowledgedAlertsInternalTool: {
                      alertsIndexPattern,
                      size,
                      description:
                        'Index pattern for security alerts and number of alerts to retrieve',
                    },
                    alertCountsInternalTool: {
                      alertsIndexPattern,
                      description: 'Index pattern for security alerts',
                    },
                  },
                },
                guidance: {
                  userConfirmation: `Ask the user: "I will use these settings: alertsIndexPattern='${alertsIndexPattern}', size=${size}, and anonymize sensitive fields like host names and IP addresses. Is this okay, or would you like to modify any settings?" After getting confirmation, proceed immediately to call the appropriate tool.`,
                  nextStep:
                    'CRITICAL: After user confirms, IMMEDIATELY call the appropriate tool (e.g., open_and_acknowledged_alerts) to answer their original question. Do NOT ask for more information or clarification. The user\'s confirmation means "proceed with the analysis using these settings".',
                },
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
