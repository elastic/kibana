/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  PRIVMON_LOGINS_INDEX_PATTERN,
  PRIVMON_USERS_INDEX_PATTERN,
} from '../../../../../common/entity_analytics/privmon';
import type { PrivilegedUserDoc } from '../../../../../common/api/entity_analytics/privmon';
import { API_VERSIONS, RISK_SCORE_INDEX_PATTERN } from '../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { privilegedUsersToUserQuery } from '../../privmon/utils';

export const privilegedUsersRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/privileged_users',
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (context, _, response): Promise<IKibanaResponse<object>> => {
        const siemResponse = buildSiemResponse(response);
        const { getAppClient } = await context.securitySolution;

        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const privilegedUsersResponse = await esClient.search<PrivilegedUserDoc>({
            body: {
              sort: [
                {
                  created_at: {
                    order: 'desc',
                  },
                },
              ],
            },
            size: 500,
            index: PRIVMON_USERS_INDEX_PATTERN,
          });
          const privilegedUsers = privilegedUsersResponse.hits.hits.map(
            (hit) => hit._source as PrivilegedUserDoc
          );

          const query = privilegedUsersToUserQuery(privilegedUsers, logger);

          const riskPrivilegedUsersResponse = await esClient.search({
            body: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              query,
            },
            size: 100,
            index: RISK_SCORE_INDEX_PATTERN,
          });

          const riskPrivilegedUsers = riskPrivilegedUsersResponse.hits.hits.map(
            (hit) => hit._source
          );

          const successfulPrivilegedAccessResponse = await esClient.search({
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
                  filter: [
                    privilegedUsersToUserQuery(privilegedUsers, logger),
                    {
                      bool: {
                        must: [
                          {
                            match: {
                              'event.outcome': 'success',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            size: 100,
            index: PRIVMON_LOGINS_INDEX_PATTERN,
          });

          const successfulPrivilegedAccess = successfulPrivilegedAccessResponse.hits.hits.map(
            (hit) => hit._source
          );

          const unusualAccessPatternsResponse = await esClient.search({
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
                  filter: [
                    privilegedUsersToUserQuery(privilegedUsers, logger),
                    {
                      bool: {
                        must: [
                          {
                            match: {
                              'kibana.alert.rule.tags': 'Privileged User Monitoring',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            size: 100,
            index: getAppClient().getAlertsIndex(),
          });

          const unusualAccessPatterns = unusualAccessPatternsResponse.hits.hits.map(
            (hit) => hit._source
          );

          return response.ok({
            body: {
              newPrivilegedUsers: privilegedUsers,
              riskPrivilegedUsers,
              successfulPrivilegedAccess,
              unusualAccessPatterns,
            },
          });
        } catch (e) {
          logger.error(`Error in privilegedUsersRoute: + ${JSON.stringify(e)}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
