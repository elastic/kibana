/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import {
  PRIVMON_LOGINS_INDEX_PATTERN,
  PRIVMON_PRIVILEGES_INDEX_PATTERN,
} from '../../../../../common/entity_analytics/privmon';
import { API_VERSIONS } from '../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../types';

export const privilegedUsersFlyoutRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/privileged_users_flyout',
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: schema.object({
              userNames: schema.arrayOf(schema.string({ minLength: 1 })),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<object>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getAppClient } = await context.securitySolution;
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const userNamesFilter = request.body.userNames.map((userName) => ({
            term: {
              'user.name': userName,
            },
          }));

          const targetUserNamesFilter = request.body.userNames.map((userName) => ({
            term: {
              'target.user.name': userName,
            },
          }));

          const loginsResponse = await esClient.search({
            body: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              query: {
                bool: {
                  should: userNamesFilter,
                  minimum_should_match: 1,
                },
              },
            },
            size: 100,
            index: PRIVMON_LOGINS_INDEX_PATTERN,
          });
          const logins = loginsResponse.hits.hits.map((hit) => hit._source);

          const privilegesResponse = await esClient.search({
            body: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              query: {
                bool: {
                  should: [...userNamesFilter, ...targetUserNamesFilter],
                  minimum_should_match: 1,
                },
              },
            },
            size: 100,
            index: PRIVMON_PRIVILEGES_INDEX_PATTERN,
          });

          const privileges = privilegesResponse.hits.hits.map((hit) => hit._source);

          const alertsResponse = await esClient.search({
            body: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              query: {
                bool: {
                  should: userNamesFilter,
                  minimum_should_match: 1,
                },
              },
            },
            size: 100,
            index: getAppClient().getAlertsIndex(),
          });

          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);

          return response.ok({
            body: {
              logins,
              privileges,
              alerts,
            },
          });
        } catch (e) {
          logger.error(`Error in privilegedUsersFlyoutRoute: + ${JSON.stringify(e)}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
