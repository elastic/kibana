/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger, ElasticsearchClient } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AttackDiscoveryMissingPrivileges } from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES,
  GetAttackDiscoveryMissingPrivilegesInternalResponse,
} from '@kbn/elastic-assistant-common';
import type {
  SecurityHasPrivilegesResponse,
  SecurityIndexPrivilege,
} from '@elastic/elasticsearch/lib/api/types';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';

import { getScheduledIndexPattern } from '../../../lib/attack_discovery/persistence/get_scheduled_index_pattern';
import { buildResponse } from '../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { performChecks } from '../../helpers';

const REQUIRED_INDEX_PRIVILEGES: SecurityIndexPrivilege[] = [
  'read',
  'write',
  'view_index_metadata',
  'maintenance',
];

export const getMissingIndexPrivileges = (
  indexName: string,
  privilegesResponse: SecurityHasPrivilegesResponse
): AttackDiscoveryMissingPrivileges | undefined => {
  const privileges = privilegesResponse.index[indexName] ?? {};
  const missingPrivileges = REQUIRED_INDEX_PRIVILEGES.filter((privilege) => !privileges[privilege]);

  if (missingPrivileges.length) {
    return { index_name: indexName, privileges: missingPrivileges };
  }
};

export const getMissingIndexPrivilegesInternalRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(
                  GetAttackDiscoveryMissingPrivilegesInternalResponse
                ),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetAttackDiscoveryMissingPrivilegesInternalResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        // Perform license and authenticated user
        const checkResponse = await performChecks({
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const spaceId = dataClient.spaceId;
          const indexPattern = getScheduledIndexPattern(spaceId);
          const adhocIndexPattern = dataClient.getAdHocAlertsIndexPattern();

          const privileges = await readIndexPrivileges(esClient, [indexPattern, adhocIndexPattern]);

          const missingPrivileges = [];
          const missingIndexPrivileges = getMissingIndexPrivileges(indexPattern, privileges);
          if (missingIndexPrivileges) {
            missingPrivileges.push(missingIndexPrivileges);
          }
          const missingAdhocIndexPrivileges = getMissingIndexPrivileges(
            adhocIndexPattern,
            privileges
          );
          if (missingAdhocIndexPrivileges) {
            missingPrivileges.push(missingAdhocIndexPrivileges);
          }

          return response.ok({ body: missingPrivileges });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};

const readIndexPrivileges = async (
  esClient: ElasticsearchClient,
  indices: string[]
): Promise<SecurityHasPrivilegesResponse> => {
  const response = await esClient.security.hasPrivileges(
    {
      index: [{ names: indices, privileges: REQUIRED_INDEX_PRIVILEGES }],
    },
    { meta: true }
  );
  return response.body;
};
