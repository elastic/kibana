/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_FIND,
  AttackDiscoveryFindRequestQuery,
  AttackDiscoveryFindResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../../helpers';
import { throwIfPublicApiDisabled } from '../../helpers/throw_if_public_api_disabled';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { hasReadAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';

export const findAttackDiscoveriesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'public',
      path: ATTACK_DISCOVERY_FIND,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
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
          await throwIfPublicApiDisabled(context);

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
              enableFieldRendering: query.enable_field_rendering ?? false, // default to false for public APIs
              end: query.end,
              page: query.page,
              perPage: query.per_page,
              sortField: query.sort_field,
              sortOrder: query.sort_order,
              withReplacements: query.with_replacements ?? true, // public APIs default to applying replacements in responses as a convenience to non-Kibana clients
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
