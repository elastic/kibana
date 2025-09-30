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
  ATTACK_DISCOVERY_INTERNAL_FIND,
  AttackDiscoveryFindInternalRequestQuery,
  AttackDiscoveryFindInternalResponse,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../../helpers';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { hasReadAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';

export const findAttackDiscoveriesInternalRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'internal',
      path: ATTACK_DISCOVERY_INTERNAL_FIND,
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
            query: buildRouteValidationWithZod(AttackDiscoveryFindInternalRequestQuery),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(AttackDiscoveryFindInternalResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<AttackDiscoveryFindInternalResponse>> => {
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
              includeUniqueAlertIds: query.include_unique_alert_ids ?? false,
              ids: query.ids,
              search: query.search,
              shared: query.shared,
              status: query.status,
              connectorNames: query.connector_names,
              start: query.start,
              enableFieldRendering: true, // always true for internal apis
              end: query.end,
              page: query.page,
              perPage: query.per_page,
              sortField: query.sort_field,
              sortOrder: query.sort_order,
              withReplacements: false, // always false for internal apis
            },
            logger,
          });

          return response.ok({
            body: {
              ...result,
              data: result.data.map(transformAttackDiscoveryAlertFromApi), // required by legacy internal routes
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
