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
  ATTACK_DISCOVERY_BULK,
  PostAttackDiscoveryBulkRequestBody,
  PostAttackDiscoveryBulkResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../../helpers';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';

export const postAttackDiscoveryBulkRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .post({
      access: 'public',
      path: ATTACK_DISCOVERY_BULK,
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
            body: buildRouteValidationWithZod(PostAttackDiscoveryBulkRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(PostAttackDiscoveryBulkResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostAttackDiscoveryBulkResponse>> => {
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
        const privilegesCheckResponse = await hasReadWriteAttackDiscoveryAlertsPrivileges({
          context: ctx,
          response,
        });
        if (!privilegesCheckResponse.isSuccess) {
          return privilegesCheckResponse.response;
        }

        try {
          const currentUser = await checkResponse.currentUser;
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const kibanaAlertWorkflowStatus = request.body.update?.kibana_alert_workflow_status;
          const visibility = request.body.update?.visibility;
          const ids = request.body.update?.ids;
          const enableFieldRendering = request.body.update?.enable_field_rendering ?? false; // public APIs default to rendering `james` instead of the `{{ user.name james }}` syntax, as a convenience to non-Kibana clients
          const withReplacements = request.body.update?.with_replacements ?? true; // public APIs default to applying replacements in responses as a convenience to non-Kibana clients

          if (ids == null || ids.length === 0) {
            return response.ok({
              body: { data: [] },
            });
          }

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const data = await dataClient.bulkUpdateAttackDiscoveryAlerts({
            authenticatedUser: currentUser,
            esClient,
            enableFieldRendering,
            ids,
            kibanaAlertWorkflowStatus,
            logger,
            visibility,
            withReplacements,
          });

          return response.ok({
            body: {
              data,
            },
          });
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
