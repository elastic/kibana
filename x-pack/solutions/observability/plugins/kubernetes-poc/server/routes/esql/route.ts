/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import datemath from '@kbn/datemath';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { createKubernetesPocServerRoute } from '../create_kubernetes_poc_server_route';
import type { EsqlColumn, EsqlQueryResponse } from '../../../common/esql';

/**
 * Parse a date string using datemath and return ISO timestamp
 */
function parseDateString(dateString: string, roundUp: boolean = false): string {
  const parsed = datemath.parse(dateString, { roundUp });
  if (!parsed || !parsed.isValid()) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return parsed.toISOString();
}

/**
 * Generic ES|QL query endpoint
 *
 * Accepts an ES|QL query string and optional time range parameters.
 * Returns the results as an array of row objects with column names as keys.
 */
const executeEsqlRoute = createKubernetesPocServerRoute({
  endpoint: 'POST /internal/kubernetes_poc/esql',
  options: { access: 'internal' },
  params: t.type({
    body: t.intersection([
      t.type({
        query: t.string,
      }),
      t.partial({
        from: t.string,
        to: t.string,
      }),
    ]),
  }),
  security: {
    authz: {
      requiredPrivileges: ['kibana_read'],
    },
  },
  handler: async (resources): Promise<EsqlQueryResponse> => {
    const { context, logger, response, params } = resources;
    const { query, from, to } = params.body;

    logger.debug(`ES|QL query endpoint called`);

    try {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;

      // Build the request body
      const requestBody: Record<string, unknown> = {
        query,
      };

      // Add time range filter if provided
      if (from && to) {
        const fromTimestamp = parseDateString(from, false);
        const toTimestamp = parseDateString(to, true);

        requestBody.filter = {
          range: {
            '@timestamp': {
              gte: fromTimestamp,
              lte: toTimestamp,
            },
          },
        };
      }

      const esqlResponse = (await esClient.transport.request({
        method: 'POST',
        path: '/_query',
        body: requestBody,
      })) as ESQLSearchResponse;

      const columns = esqlResponse.columns as EsqlColumn[];
      const values = esqlResponse.values as unknown[][];

      // Create a column index map for easy access
      const columnIndex = columns.reduce<Record<string, number>>((acc, col, index) => {
        acc[col.name] = index;
        return acc;
      }, {});

      // Transform ES|QL response into row objects with column names as keys
      const rows = values.map((row) => {
        const rowObj: Record<string, unknown> = {};
        columns.forEach((col, index) => {
          rowObj[col.name] = row[index];
        });
        return rowObj;
      });

      logger.debug(`ES|QL query returned ${rows.length} rows`);

      return { columns, rows };
    } catch (error) {
      logger.error(`Error executing ES|QL query: ${error.message}`);
      throw response.customError({
        statusCode: 500,
        body: { message: `Failed to execute ES|QL query: ${error.message}` },
      });
    }
  },
});

export const esqlRouteRepository = {
  ...executeEsqlRoute,
};
