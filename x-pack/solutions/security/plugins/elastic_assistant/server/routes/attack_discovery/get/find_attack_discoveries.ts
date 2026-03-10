/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_FIND,
  AttackDiscoveryFindRequestQuery,
  AttackDiscoveryFindResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../helpers';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { hasReadAttackDiscoveryAlertsPrivileges } from '../helpers/index_privileges';

export const findAttackDiscoveriesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'internal',
      path: ATTACK_DISCOVERY_FIND,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(AttackDiscoveryFindRequestQuery),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(AttackDiscoveryFindResponse),
              },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<AttackDiscoveryFindResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        // Perform license and authenticated user checks:
        const checkResponse = await performChecks({
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        // Perform alerts access check
        const privilegesCheckResponse = await hasReadAttackDiscoveryAlertsPrivileges({
          context: ctx,
          response,
        });
        if (!privilegesCheckResponse.isSuccess) {
          return privilegesCheckResponse.response;
        }

        try {
          const { query } = request;
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const currentUser = await checkResponse.currentUser;

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const result = await dataClient.findAttackDiscoveryAlerts({
            authenticatedUser: currentUser,
            esClient,
            findAttackDiscoveryAlertsParams: {
              alertIds: query.alert_ids,
              ids: query.ids,
              search: query.search,
              shared: query.shared,
              status: query.status,
              connectorNames: query.connector_names,
              start: query.start,
              end: query.end,
              page: query.page,
              perPage: query.per_page,
              sortField: query.sort_field,
              sortOrder: query.sort_order,
            },
            logger,
          });

          return response.ok({
            body: {
              ...result,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
