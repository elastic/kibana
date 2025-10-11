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
import { contentReferenceString, securityAlertsPageReference } from '@kbn/elastic-assistant-common';
import { ToolType } from '@kbn/onechat-common';
import { getAlertsCountQuery } from './get_alert_counts_query';
import { getPrompt } from '@kbn/security-ai-prompts';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

const alertCountsToolSchema = z.object({
  alertsIndexPattern: z.string().describe('The index pattern for alerts'),
});

export const ALERT_COUNTS_INTERNAL_TOOL_ID = 'core.security.alert_counts';

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

      // Add a security alerts page reference
      const alertsCountReference = context.contentReferencesStore.add((p) =>
        securityAlertsPageReference(p.id)
      );

      // Format the reference string
      const reference = `\n${contentReferenceString(alertsCountReference)}`;

      return {
        results: [
          {
            // TODO steph sync with Soren from o11y on tool type
            type: ToolResultType.other,
            data: {
              result,
              reference,
            },
          },
        ],
      };
    },
    tags: ['alerts', 'alerts-count', 'security'],
  };
};
