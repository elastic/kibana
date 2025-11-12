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

const searchAlertsSchema = z.object({
  end: z.string().describe('The end of the date range'),
  start: z.string().describe('The start of the date range'),
  status: z.string().optional().describe('The alert workflow status'),
});

export const SEARCH_ALERTS_TOOL_ID = securityTool('search_alerts');
export const searchAlertsTool = (): BuiltinToolDefinition<typeof searchAlertsSchema> => {
  return {
    id: SEARCH_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Use this tool whenever someone asks about alerts. Specifically, these are alerts that run in Elastic security. Users might ask things like:

- How many open alerts do I have?
- Based on our alerts, who is the riskiest user in our environment?
- What are the mosts infected hosts with malware over time?`,
    schema: searchAlertsSchema,
    handler: async (params, { request, esClient }) => {
      const spaceId = getSpaceIdFromRequest(request);
      const spaceAwareIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      // Get the ESQL query with the space-aware index
      const spaceAwareQuery = getAlertsEsqlQuery(
        spaceAwareIndex,
        '(@timestamp <=?end and @timestamp >?start) and TO_LOWER(kibana.alert.workflow_status) == ?status'
      );

      // Create ESQL tool configuration
      const esqlConfig: EsqlToolConfig = {
        query: spaceAwareQuery,
        params: {
          end: {
            type: 'keyword',
            description: 'The end of the date range',
            optional: false,
          },
          start: {
            type: 'keyword',
            description: 'The start of the date range',
            optional: false,
          },
          status: {
            type: 'keyword',
            description: 'The alert workflow status',
            optional: true,
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
    tags: ['alerts', 'security'],
  };
};
