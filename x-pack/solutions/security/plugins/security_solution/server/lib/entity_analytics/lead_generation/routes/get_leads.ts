/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';

import {
  GET_LEADS_URL,
  getLeadsIndexName,
} from '../../../../../common/entity_analytics/lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const GetLeadsQueryParams = z.object({
  size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
  from: z.coerce.number().int().min(0).optional().default(0),
});

export const getLeadsRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_LEADS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetLeadsQueryParams),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const { size, from } = request.query;
          const adhocIndex = getLeadsIndexName(spaceId, 'adhoc');
          const scheduledIndex = getLeadsIndexName(spaceId, 'scheduled');

          let leads: unknown[] = [];
          let total = 0;

          try {
            const resp = await esClient.search({
              index: `${adhocIndex},${scheduledIndex}`,
              size,
              from,
              sort: [{ timestamp: { order: 'desc' } }],
              query: { match_all: {} },
              ignore_unavailable: true,
              track_total_hits: true,
            });

            leads = resp.hits.hits
              .map((hit) => hit._source)
              .filter((doc): doc is Record<string, unknown> => doc != null);

            total =
              typeof resp.hits.total === 'number'
                ? resp.hits.total
                : resp.hits.total?.value ?? leads.length;
          } catch (searchError) {
            logger.debug(`[LeadGeneration] Leads indices not available yet: ${searchError}`);
          }

          return response.ok({
            body: {
              leads,
              total,
              page: { size, from },
            },
          });
        } catch (e) {
          logger.error(`[LeadGeneration] Error reading leads: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
