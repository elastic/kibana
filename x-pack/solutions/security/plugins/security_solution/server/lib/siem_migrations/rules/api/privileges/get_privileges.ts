/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IKibanaResponse, Logger } from '@kbn/core/server';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  SIEM_RULE_MIGRATION_PRIVILEGES_PATH,
  LOOKUPS_INDEX_PREFIX,
} from '../../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../util/with_license';

export const registerSiemRuleMigrationsGetPrivilegesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_RULE_MIGRATION_PRIVILEGES_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      { version: '1', validate: false },
      withLicense(async (context, request, response): Promise<IKibanaResponse<object>> => {
        try {
          const core = await context.core;
          const securitySolution = await context.securitySolution;
          const siemClient = securitySolution?.getAppClient();
          const esClient = core.elasticsearch.client.asCurrentUser;

          if (!siemClient) {
            return response.notFound();
          }

          const clusterPrivileges = await readPrivileges(esClient, `${LOOKUPS_INDEX_PREFIX}*`);

          const privileges = {
            ...(clusterPrivileges as object),
            is_authenticated: request.auth.isAuthenticated ?? false,
          };

          return response.ok({ body: privileges });
        } catch (err) {
          logger.error(err);
          return response.badRequest({ body: err.message });
        }
      })
    );
};

const readPrivileges = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<SecurityHasPrivilegesResponse> => {
  const response = await esClient.security.hasPrivileges(
    {
      body: {
        index: [
          {
            names: [index],
            privileges: [
              'read',
              'write',
              'view_index_metadata',
              'manage',
              'create_doc',
              'create_index',
              'index',
            ],
          },
        ],
      },
    },
    { meta: true }
  );
  return response.body;
};
