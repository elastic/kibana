/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { generateEsql } from '@kbn/onechat-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { getSpaceIdFromRequest } from '../helpers';
import { securityTool } from '../constants';

const alertsSchema = z.object({
  query: z
    .string()
    .describe('A natural language query expressing the search request for security alerts'),
  index: z
    .string()
    .optional()
    .describe(
      'Specific alerts index to search against. If not provided, will search against .alerts-security.alerts-* pattern.'
    ),
});

export const SECURITY_ALERTS_TOOL_ID = securityTool('alerts');

const KEEP_FIELDS = [
  '@timestamp',
  'host.name',
  'user.name',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'source.ip',
  'destination.ip',
  'event.category',
  'message',
].join(', ');

const ADDITIONAL_INSTRUCTIONS = `When querying security alert indices, ALWAYS use the KEEP command to filter fields and reduce response size. Include these essential fields: ${KEEP_FIELDS}. Example: FROM .alerts-security.alerts-* | KEEP ${KEEP_FIELDS} | ...`;

export const alertsTool = (): BuiltinToolDefinition<typeof alertsSchema> => {
  return {
    id: SECURITY_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze security alerts using full-text or structured queries for finding, counting, aggregating, or summarizing alerts.`,
    schema: alertsSchema,
    handler: async (
      { query: nlQuery, index },
      { request, esClient, modelProvider, logger, events }
    ) => {
      // Determine the index to use: either explicitly provided or based on the current space
      const spaceId = getSpaceIdFromRequest(request);
      const searchIndex = index ?? `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      logger.debug(`alerts tool called with query: ${nlQuery}, index: ${searchIndex}`);

      try {
        // Generate ES|QL query with automatic KEEP field filtering
        const esqlResponse = await generateEsql({
          nlQuery,
          index: searchIndex,
          additionalInstructions: ADDITIONAL_INSTRUCTIONS,
          executeQuery: true,
          model: await modelProvider.getDefaultModel(),
          esClient: esClient.asCurrentUser,
          logger,
          events,
        });

        if (esqlResponse.error) {
          return {
            results: [
              {
                type: 'error',
                data: {
                  message: esqlResponse.error,
                },
              },
            ],
          };
        }

        const results = [];

        if (esqlResponse.query) {
          results.push({
            type: 'query',
            data: {
              esql: esqlResponse.query,
            },
          });
        }

        if (esqlResponse.results) {
          results.push({
            type: 'tabularData',
            data: {
              source: 'esql',
              query: esqlResponse.query || '',
              columns: esqlResponse.results.columns,
              values: esqlResponse.results.values,
            },
          });
        }

        if (esqlResponse.answer) {
          results.push({
            type: 'other',
            data: {
              answer: esqlResponse.answer,
            },
          });
        }

        return { results };
      } catch (error) {
        logger.error(`Error in alerts tool: ${error.message}`);
        return {
          results: [
            {
              type: 'error',
              data: {
                message: `Error: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'alerts'],
  };
};
