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
  securityAlertReference,
  contentReferenceBlock,
} from '@kbn/elastic-assistant-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
// import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';

export type OpenAndAcknowledgedAlertsInternalToolParams = Require<
  AssistantToolParams,
  'alertsIndexPattern' | 'size'
>;

const openAndAcknowledgedAlertsToolSchema = z.object({
  alertsIndexPattern: z.string().describe('The index pattern for alerts'),
  size: z.number().min(1).max(1000).describe('The number of alerts to retrieve (1-1000)'),
  // anonymizationFields: z.array(z.any()).optional().describe('Fields to anonymize in the response'),
});

export const OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_DESCRIPTION =
  'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts. Do not call this tool for alert count or quantity. The output is an array of the latest n open and acknowledged alerts.';

/**
 * Returns a tool for querying open and acknowledged alerts using the InternalToolDefinition pattern.
 */
export const openAndAcknowledgedAlertsInternalTool = (): BuiltinToolDefinition<
  typeof openAndAcknowledgedAlertsToolSchema
> => {
  return {
    id: 'open-and-acknowledged-alerts-internal-tool',
    description: OPEN_AND_ACKNOWLEDGED_ALERTS_INTERNAL_TOOL_DESCRIPTION,
    schema: openAndAcknowledgedAlertsToolSchema,
    handler: async ({ alertsIndexPattern, size }, context) => {
      // Validate size is within range
      if (sizeIsOutOfRange(size)) {
        throw new Error(`Size ${size} is out of range`);
      }

      const query = getOpenAndAcknowledgedAlertsQuery({
        alertsIndexPattern,
        anonymizationFields: [],
        size,
      });

      const result = await context.esClient.asCurrentUser.search<SearchResponse>(query);

      // Process the alerts with content references
      const content = result.hits?.hits?.map((hit) => {
        const rawData = getRawDataOrDefault(hit.fields);
        const transformed = transformRawData({
          anonymizationFields: [],
          currentReplacements: {}, // Simplified for internal tool
          getAnonymizedValue,
          onNewReplacements: () => Promise.resolve({}), // Simplified for internal tool
          rawData,
        });

        const hitId = hit._id;
        const reference = hitId
          ? context.contentReferencesStore.add((p) => securityAlertReference(p.id, hitId))
          : undefined;
        const citation = reference && `\nCitation:${contentReferenceBlock(reference)}`;

        return `${transformed}${citation ?? ''}`;
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
