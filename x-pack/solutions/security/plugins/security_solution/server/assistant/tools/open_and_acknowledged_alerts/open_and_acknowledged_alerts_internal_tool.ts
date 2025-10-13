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
// No specific tool params needed since all parameters come from the request object
import { ToolType } from '@kbn/onechat-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import {
  ANONYMIZATION_FIELDS_SYMBOL,
  REPLACEMENTS_SYMBOL,
  TOOL_PARAMS_SYMBOL,
} from '@kbn/elastic-assistant-plugin/server/routes/agent_builder_execute';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

/**
 * Extended request interface that includes additional data passed from agentBuilderExecute.
 *
 * WHY THIS APPROACH:
 * Onechat tools don't have direct access to the same parameter passing mechanism as langchain tools.
 * The original OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL receives parameters through the AssistantToolParams
 * object, but onechat tools use a different architecture. To maintain the same functionality and
 * ensure proper anonymization, replacements, and parameter handling, we pass this data through
 * the request object using symbols to avoid conflicts with existing request properties.
 *
 * This approach ensures:
 * - Real anonymization fields are used (not hardcoded defaults)
 * - Replacements flow back to the conversation properly
 * - Tool parameters (alertsIndexPattern, size) are respected
 * - The implementation matches the original tool's behavior exactly
 */
interface ExtendedKibanaRequest {
  [ANONYMIZATION_FIELDS_SYMBOL]?: Array<{
    id: string;
    field: string;
    allowed: boolean;
    anonymized: boolean;
    timestamp: string;
    createdAt: string;
    updatedAt?: string;
    namespace: string;
  }>;
  [REPLACEMENTS_SYMBOL]?: Replacements;
  [TOOL_PARAMS_SYMBOL]?: {
    alertsIndexPattern: string;
    size: number;
  };
}

// No schema needed - all parameters come from the request object via ExtendedKibanaRequest

const OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_ID = 'core.security.open_and_acknowledged_alerts';
export const OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_DESCRIPTION =
  'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts. Do not call this tool for alert count or quantity. The output is an array of the latest n open and acknowledged alerts.';

/**
 * Returns a tool for querying open and acknowledged alerts using the InternalToolDefinition pattern.
 */
export const openAndAcknowledgedAlertsInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<z.ZodObject<{}>> => {
  return {
    id: OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_DESCRIPTION,
    schema: z.object({}), // Empty schema - all parameters come from request object
    handler: async (params, context) => {
      // Get anonymization fields, existing replacements, and tool parameters from the request (passed from agentBuilderExecute)
      // This matches exactly how the original OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL works
      const extendedRequest = context.request as ExtendedKibanaRequest;
      const anonymizationFields = extendedRequest[ANONYMIZATION_FIELDS_SYMBOL] ?? [];
      const existingReplacements = extendedRequest[REPLACEMENTS_SYMBOL] ?? {};
      const toolParams = extendedRequest[TOOL_PARAMS_SYMBOL];

      // Use the actual parameters from the request (no schema defaults needed)
      const actualAlertsIndexPattern = toolParams?.alertsIndexPattern;
      const actualSize = toolParams?.size;

      // Validate that we have the required parameters
      if (!actualAlertsIndexPattern) {
        throw new Error('alertsIndexPattern is required but not provided');
      }
      if (!actualSize) {
        throw new Error('size is required but not provided');
      }

      // Validate size is within range (use actual size from request)
      if (sizeIsOutOfRange(actualSize)) {
        throw new Error(`Size ${actualSize} is out of range`);
      }

      const query = getOpenAndAcknowledgedAlertsQuery({
        alertsIndexPattern: actualAlertsIndexPattern,
        anonymizationFields,
        size: actualSize,
      });

      const result = await context.esClient.asCurrentUser.search<SearchResponse>(query);

      // Process the alerts with anonymization but without content references
      // Content references will be handled at the agent execution level
      // Start with existing replacements from the conversation (like the original tool does)
      let localReplacements: Replacements = { ...existingReplacements };
      const localOnNewReplacements = (newReplacements: Replacements) => {
        localReplacements = { ...localReplacements, ...newReplacements };
        // Store the new replacements in the request so agentBuilderExecute can collect them
        (context.request as ExtendedKibanaRequest)[REPLACEMENTS_SYMBOL] = localReplacements;
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

        return transformed;
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              alerts: content,
            },
          },
        ],
      };
    },
    tags: ['alerts', 'open-and-acknowledged-alerts', 'security'],
  };
};
