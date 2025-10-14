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

// Empty schema for A2A compatibility - all configuration comes from assistant settings tool
const alertCountsToolSchema = z.object({});

export const ALERT_COUNTS_INTERNAL_TOOL_ID = 'core.security.alert_counts';
export const ALERT_COUNTS_INTERNAL_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question. ' +
  'IMPORTANT: This tool requires NO parameters. All configuration (alertsIndexPattern) is automatically retrieved from the assistant_settings tool. ' +
  'Always call the assistant_settings tool first to get current configuration and confirm with the user before calling this tool.';

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
          toolParams: { toolId: 'core.security.alert_counts' },
        });

        if (assistantSettingsResult.results && assistantSettingsResult.results.length > 0) {
          settingsData = assistantSettingsResult.results[0].data;
        }
      } catch (error) {
        // Use defaults if assistant settings fails
      }

      // Parse settings with fallback defaults
      let alertsIndexPattern = '.alerts-security.alerts-default';

      if (
        settingsData &&
        typeof settingsData === 'object' &&
        'settings' in settingsData &&
        (settingsData as Record<string, unknown>).settings &&
        typeof (settingsData as Record<string, unknown>).settings === 'object'
      ) {
        const settings = (settingsData as Record<string, unknown>).settings as Record<
          string,
          unknown
        >;
        if ('alertsIndexPattern' in settings) {
          alertsIndexPattern = settings.alertsIndexPattern as string;
        }
      }

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
