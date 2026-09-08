/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { take } from 'lodash/fp';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { WATCHLISTS_INDICES_URL } from '../../../../../../common/entity_analytics/watchlists/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

/**
 * Entity fields used to scope the index search — only indices
 * containing at least one of these fields will be returned.
 */
const WATCHLIST_ENTITY_FIELDS = [
  'user.name',
  'host.name',
  'host.id',
  'service.name',
  'user.email',
  'entity.id',
];

const LIMIT = 20;

const SearchWatchlistIndicesRequestQuery = z.object({
  searchQuery: z.string().optional(),
});

export const searchWatchlistIndicesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: WATCHLISTS_INDICES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(SearchWatchlistIndicesRequestQuery),
          },
        },
      },
      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse<{}>> => {
        const siemResponse = buildSiemResponse(response);
        const query = request.query.searchQuery;

        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const { indices, fields } = await esClient.fieldCaps({
            index: query ? `*${query}*` : '*',
            types: ['keyword'],
            fields: WATCHLIST_ENTITY_FIELDS,
            include_unmapped: true,
            ignore_unavailable: true,
            allow_no_indices: true,
            expand_wildcards: ['open', 'hidden'],
            include_empty_fields: true,
            filters: '-parent',
          });

          // Collect all indices that have at least one of the entity fields
          const matchingIndicesSet = new Set<string>();

          for (const fieldName of WATCHLIST_ENTITY_FIELDS) {
            const fieldData = fields[fieldName];
            if (fieldData) {
              for (const typeData of Object.values(fieldData)) {
                const fieldIndices = typeData.indices ?? indices;
                if (Array.isArray(fieldIndices)) {
                  for (const idx of fieldIndices) {
                    matchingIndicesSet.add(idx as string);
                  }
                }
              }
            }
          }

          const matchingIndices = Array.from(matchingIndicesSet);

          return response.ok({
            body: take(LIMIT, matchingIndices.sort()),
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error searching watchlist indices: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }, 'platinum')
    );
};
