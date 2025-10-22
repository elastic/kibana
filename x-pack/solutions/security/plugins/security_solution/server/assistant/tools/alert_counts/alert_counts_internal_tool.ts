/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import { getAlertsCountQuery } from './get_alert_counts_query';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import type { ToolCitation } from '../types';

// Schema for configuration parameters
const alertCountsToolSchema = z.object({
  alertsIndexPattern: z
    .string()
    .optional()
    .describe('The index pattern for alerts (e.g., ".alerts-security.alerts-default")'),
});

export const ALERT_COUNTS_INTERNAL_TOOL_ID = 'core.security.alert_counts';
export const ALERT_COUNTS_INTERNAL_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question. ' +
  'IMPORTANT: This tool accepts an optional alertsIndexPattern parameter. If not provided, a sensible default will be used. ' +
  'WORKFLOW: First call the assistant_settings tool with toolId="core.security.alert_counts" to get current configuration, then call this tool with the retrieved settings.';

/**
 * Returns a tool for querying alert counts using the InternalToolDefinition pattern.
 */
export const alertCountsInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof alertCountsToolSchema> => {
  return {
    id: ALERT_COUNTS_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: ALERT_COUNTS_INTERNAL_TOOL_DESCRIPTION,
    schema: alertCountsToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'],
        promptId: 'AlertCountsTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async (params, context) => {
      // Use provided parameters or fall back to defaults
      const { alertsIndexPattern = '.alerts-security.alerts-default' } = params;

      const query = getAlertsCountQuery(alertsIndexPattern);
      const result = await context.esClient.asCurrentUser.search<SearchResponse>(query);

      const citationId = 'security-alerts-page';

      // Embed citation inline in the result content
      const resultWithCitation = `{reference(${citationId})}\n${JSON.stringify(result)}`;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              result: resultWithCitation,
              citations: [
                {
                  id: citationId,
                  type: 'SecurityAlertsPage',
                  metadata: {},
                },
              ] as ToolCitation[],
            },
          },
        ],
      };
    },
    tags: ['alerts', 'alerts-count', 'security'],
  };
};
