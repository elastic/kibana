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
import { getAlertsCountQuery } from './get_alert_counts_query';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

const alertCountsToolSchema = z.object({
  alertsIndexPattern: z
    .string()
    .describe('The index pattern for alerts')
    .default('.alerts-security.alerts-default'),
});

export const ALERT_COUNTS_INTERNAL_TOOL_ID = 'core.security.alert_counts';
export const ALERT_COUNTS_INTERNAL_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question.';

/**
 * Returns a tool for querying alert counts using the InternalToolDefinition pattern.
 */
export const alertCountsInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof alertCountsToolSchema> => {
  return {
    id: ALERT_COUNTS_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: ALERT_COUNTS_INTERNAL_TOOL_DESCRIPTION,
    schema: alertCountsToolSchema,
    handler: async ({ alertsIndexPattern }, context) => {
      const query = getAlertsCountQuery(alertsIndexPattern);
      const result = await context.esClient.asCurrentUser.search<SearchResponse>(query);

      // Return the result in the same format as the original tool
      // Content references will be handled at the agent execution level
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              result: JSON.stringify(result),
            },
          },
        ],
      };
    },
    tags: ['alerts', 'alerts-count', 'security'],
  };
};
