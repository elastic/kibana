/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  getAnonymizedValue,
  getOpenAndAcknowledgedAlertsQuery,
  getRawDataOrDefault,
  sizeIsOutOfRange,
  transformRawData,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// Extended request type to store tool replacements temporarily
interface ExtendedKibanaRequest {
  __toolReplacements?: Replacements;
}

// Type for anonymization fields
interface AnonymizationField {
  id: string;
  field: string;
  allowed: boolean;
  anonymized: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt?: string;
  namespace: string;
}

// Empty schema for A2A compatibility - all configuration comes from assistant settings tool
const openAndAcknowledgedAlertsToolSchema = z.object({});

// Default anonymization fields
const DEFAULT_ANONYMIZATION_FIELDS: AnonymizationField[] = [
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

// Helper function to parse assistant settings and extract configuration
const parseAssistantSettings = (settingsData: unknown) => {
  const result = {
    anonymizationFields: DEFAULT_ANONYMIZATION_FIELDS,
    alertsIndexPattern: '.alerts-security.alerts-default',
    size: 100,
  };

  if (
    settingsData &&
    typeof settingsData === 'object' &&
    'settings' in settingsData &&
    settingsData.settings &&
    typeof settingsData.settings === 'object'
  ) {
    // Get anonymization fields
    if (
      'anonymizationFields' in settingsData.settings &&
      Array.isArray(settingsData.settings.anonymizationFields)
    ) {
      result.anonymizationFields = settingsData.settings.anonymizationFields;
    }

    // Get defaults for this tool
    if (
      'defaults' in settingsData.settings &&
      settingsData.settings.defaults &&
      typeof settingsData.settings.defaults === 'object' &&
      'openAndAcknowledgedAlertsInternalTool' in settingsData.settings.defaults
    ) {
      const toolDefaults = settingsData.settings.defaults.openAndAcknowledgedAlertsInternalTool;
      if (toolDefaults && typeof toolDefaults === 'object') {
        if (
          'alertsIndexPattern' in toolDefaults &&
          typeof toolDefaults.alertsIndexPattern === 'string'
        ) {
          result.alertsIndexPattern = toolDefaults.alertsIndexPattern;
        }
        if ('size' in toolDefaults && typeof toolDefaults.size === 'number') {
          result.size = toolDefaults.size;
        }
      }
    }
  }

  return result;
};

const OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_ID = 'core.security.open_and_acknowledged_alerts';
export const OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_DESCRIPTION =
  'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts. Do not call this tool for alert count or quantity. The output is an array of the latest n open and acknowledged alerts. ' +
  'IMPORTANT: This tool requires NO parameters. All configuration (alertsIndexPattern, size, anonymizationFields) is automatically retrieved from the assistant_settings tool. ' +
  'Always call the assistant_settings tool first to get current configuration before calling this tool.';

/**
 * Returns a tool for querying open and acknowledged alerts using the InternalToolDefinition pattern.
 */
export const openAndAcknowledgedAlertsInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof openAndAcknowledgedAlertsToolSchema> => {
  return {
    id: OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_DESCRIPTION,
    schema: openAndAcknowledgedAlertsToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'],
        promptId: 'OpenAndAcknowledgedAlertsTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async (params, context) => {
      // Get configuration from assistant settings tool (with fallback defaults)
      let settingsData: unknown = null;

      try {
        const [, pluginsStart] = await getStartServices();
        const toolRegistry = await pluginsStart.onechat.tools.getRegistry({
          request: context.request,
        });
        const assistantSettingsResult = await toolRegistry.execute({
          toolId: 'core.security.assistant_settings',
          toolParams: {},
        });

        if (assistantSettingsResult.results && assistantSettingsResult.results.length > 0) {
          settingsData = assistantSettingsResult.results[0].data;
        }
      } catch (error) {
        // Use defaults if assistant settings fails
      }

      // Always use parseAssistantSettings to get configuration (with fallbacks)
      const parsed = parseAssistantSettings(settingsData);
      const {
        alertsIndexPattern: actualAlertsIndexPattern,
        size: actualSize,
        anonymizationFields,
      } = parsed;

      // Validate size is within range
      if (sizeIsOutOfRange(actualSize)) {
        throw new Error(`Size ${actualSize} is out of range`);
      }

      const query = getOpenAndAcknowledgedAlertsQuery({
        alertsIndexPattern: actualAlertsIndexPattern,
        anonymizationFields,
        size: actualSize,
      });

      const result = await context.esClient.asCurrentUser.search<SearchResponse>(query);

      // Process the alerts with anonymization
      // For A2A compatibility, we don't handle replacements here - they should be handled at the agent level
      let localReplacements: Replacements = {};
      const localOnNewReplacements = (newReplacements: Replacements) => {
        localReplacements = { ...localReplacements, ...newReplacements };
        return Promise.resolve(localReplacements);
      };

      const content = result.hits?.hits?.map((hit) => {
        const rawData = getRawDataOrDefault(hit.fields);

        const transformed = transformRawData({
          anonymizationFields,
          currentReplacements: localReplacements,
          getAnonymizedValue,
          onNewReplacements: localOnNewReplacements,
          rawData,
        });

        // Return the transformed string content for the LLM to see
        // The _id is stored separately for citation handling
        return transformed;
      });

      const toolResult = {
        results: [
          {
            type: ToolResultType.other,
            data: {
              alerts: content,
              // Note: replacements are NOT included in the data sent to LLM
              // They are collected separately and used at the conversation level
            },
          },
        ],
      };

      // Store replacements in request context for agent execution to access
      // This is a temporary solution until onechat provides a proper way to pass replacements
      (context.request as ExtendedKibanaRequest).__toolReplacements = localReplacements;

      return toolResult;
    },
    tags: ['alerts', 'open-and-acknowledged-alerts', 'security'],
  };
};
