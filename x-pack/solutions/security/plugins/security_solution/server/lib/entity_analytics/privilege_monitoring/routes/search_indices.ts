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
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  API_VERSIONS,
  APP_ID,
  EXCLUDE_ELASTIC_CLOUD_INDICES,
  INCLUDE_INDEX_PATTERN,
} from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { SearchPrivilegesIndicesRequestQuery } from '../../../../../common/api/entity_analytics/monitoring';

// Return a subset of all indices that contain the user.name field
const LIMIT = 20;

// Indices that are exclude from the search
const PRE_EXCLUDE_INDICES: string[] = [
  ...INCLUDE_INDEX_PATTERN.map((index) => `-${index}`),
  ...EXCLUDE_ELASTIC_CLOUD_INDICES,
];

// Indices that are excludes from the search result (This patterns can't be excluded from the search)
const POST_EXCLUDE_INDICES = ['.']; // internal indices

export const searchPrivilegeMonitoringIndicesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/privileges/indices',
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
            query: buildRouteValidationWithZod(SearchPrivilegesIndicesRequestQuery),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<{}>> => {
        const coreContext = await context.core;
        const siemResponse = buildSiemResponse(response);

        const query = request.query.searchQuery;

        try {
          const { indices } = await coreContext.elasticsearch.client.asCurrentUser.fieldCaps({
            index: [query ? `*${query}*` : '*', ...PRE_EXCLUDE_INDICES],
            types: ['keyword'],
            fields: ['user.name'], // search for indices with field 'user.name' of type 'keyword'
            include_unmapped: false,
            ignore_unavailable: true,
            allow_no_indices: true,
            expand_wildcards: 'open',
            include_empty_fields: false,
            filters: '-parent',
          });

          if (!Array.isArray(indices) || indices.length === 0) {
            return response.ok({
              body: [],
            });
          }

          return response.ok({
            body: take(
              LIMIT,
              indices.filter(
                (name) => !POST_EXCLUDE_INDICES.some((pattern) => name.startsWith(pattern))
              )
            ),
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error searching privilege monitoring indices: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
