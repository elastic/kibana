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
  ATTACK_DISCOVERY_INTERNAL_BULK,
  PostAttackDiscoveryBulkInternalRequestBody,
  PostAttackDiscoveryBulkInternalResponse,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../../helpers';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';

/** depreciated internal API route, to be removed in a future release */
export const postAttackDiscoveryBulkInternalRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_INTERNAL_BULK,
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
            body: buildRouteValidationWithZod(PostAttackDiscoveryBulkInternalRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(PostAttackDiscoveryBulkInternalResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostAttackDiscoveryBulkInternalResponse>> => {
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

          if (ids == null || ids.length === 0) {
            return response.ok({
              body: { data: [] },
            });
          }

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const enableFieldRendering = true; // the depreciated internal API, only used by Kibana, always enables field rendering
          const withReplacements = false; // the depreciated internal API, only used by Kibana, never applies replacements

          const data = await dataClient.bulkUpdateAttackDiscoveryAlerts({
            authenticatedUser: currentUser,
            enableFieldRendering,
            esClient,
            ids,
            kibanaAlertWorkflowStatus,
            logger,
            visibility,
            withReplacements,
          });

          return response.ok({
            body: {
              data: data.map(transformAttackDiscoveryAlertFromApi), // required by legacy internal routes
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
