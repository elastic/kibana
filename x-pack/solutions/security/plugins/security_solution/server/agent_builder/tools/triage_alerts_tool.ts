/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { ToolType, ToolResultType, type EsqlToolConfig } from '@kbn/onechat-common';
import { interpolateEsqlQuery } from '@kbn/onechat-genai-utils/tools/utils';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server/tools';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from '../constants';
import { getAlertsEsqlQuery } from './esql_queries';

const triageAlertSchema = z.object({
  id: z.string().describe('The id of the alert to investigate'),
});

export const TRIAGE_ALERTS_TOOL_ID = securityTool('triage_alerts');
export const triageAlertsTool = (): BuiltinToolDefinition<typeof triageAlertSchema> => {
  return {
    id: TRIAGE_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: 'Use this tool when asked to triage an individual alert id.',
    schema: triageAlertSchema,
    handler: async (params, { request, esClient }) => {
      const spaceId = getSpaceIdFromRequest(request);
      const spaceAwareIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      // Get the ESQL query with the space-aware index
      const spaceAwareQuery = getAlertsEsqlQuery(spaceAwareIndex, '_id == ?id');

      // Create ESQL tool configuration
      const esqlConfig: EsqlToolConfig = {
        query: spaceAwareQuery,
        params: {
          id: {
            type: 'keyword',
            description: 'The id of the alert to investigate',
            optional: false,
          },
        },
      };

      // Resolve parameters with defaults
      const resolvedParams = Object.keys(esqlConfig.params).reduce((acc, paramName) => {
        const param = esqlConfig.params[paramName];
        const providedValue = params[paramName as keyof typeof params];

        if (providedValue !== undefined) {
          acc[paramName] = providedValue;
        } else if (param.optional && param.defaultValue !== undefined) {
          acc[paramName] = param.defaultValue;
        } else {
          acc[paramName] = null;
        }

        return acc;
      }, {} as Record<string, unknown>);

      // Build parameter array for ES client
      const paramArray = Object.keys(esqlConfig.params).map((param) => ({
        [param]: resolvedParams[param] ?? null,
      }));

      // Execute ESQL query
      const client = esClient.asCurrentUser;
      const result = await client.esql.query({
        query: esqlConfig.query,
        params: paramArray as unknown as FieldValue[],
      });

      // Interpolate query for display
      const interpolatedQuery = interpolateEsqlQuery(esqlConfig.query, resolvedParams);

      return {
        results: [
          {
            type: ToolResultType.query,
            data: {
              esql: interpolatedQuery,
            },
          },
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.tabularData,
            data: {
              source: 'esql',
              query: interpolatedQuery,
              columns: result.columns,
              values: result.values,
            },
          },
        ],
      };
    },
    tags: ['security', 'alerts', 'triage', 'agent'],
  };
};
