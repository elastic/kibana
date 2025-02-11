/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryPostRequestBody,
  AttackDiscoveryPostResponse,
  API_VERSIONS,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { transformError } from '@kbn/securitysolution-es-utils';

import moment from 'moment/moment';
import { ATTACK_DISCOVERY } from '../../../../common/constants';
import { handleGraphError } from './helpers/handle_graph_error';
import { updateAttackDiscoveries, updateAttackDiscoveryStatusToRunning } from '../helpers/helpers';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { invokeAttackDiscoveryGraph } from './helpers/invoke_attack_discovery_graph';
import { requestIsValid } from './helpers/request_is_valid';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export const postAttackDiscoveryRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AttackDiscoveryPostRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(AttackDiscoveryPostResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<AttackDiscoveryPostResponse>> => {
        const startTime = moment(); // start timing the generation
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;
        const savedObjectsClient = assistantContext.savedObjectsClient;

        try {
          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          // get parameters from the request body
          const alertsIndexPattern = decodeURIComponent(request.body.alertsIndexPattern);
          const {
            apiConfig,
            anonymizationFields,
            end,
            filter,
            langSmithApiKey,
            langSmithProject,
            replacements,
            size,
            start,
          } = request.body;

          if (
            !requestIsValid({
              alertsIndexPattern,
              request,
              size,
            })
          ) {
            return resp.error({
              body: 'Bad Request',
              statusCode: 400,
            });
          }

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // callback to accumulate the latest replacements:
          let latestReplacements: Replacements = { ...replacements };
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          const { currentAd, attackDiscoveryId } = await updateAttackDiscoveryStatusToRunning(
            dataClient,
            authenticatedUser,
            apiConfig,
            size
          );

          // Don't await the results of invoking the graph; (just the metadata will be returned from the route handler):
          invokeAttackDiscoveryGraph({
            actionsClient,
            alertsIndexPattern,
            anonymizationFields,
            apiConfig,
            connectorTimeout: CONNECTOR_TIMEOUT,
            end,
            esClient,
            filter,
            langSmithProject,
            langSmithApiKey,
            latestReplacements,
            logger,
            onNewReplacements,
            savedObjectsClient,
            size,
            start,
          })
            .then(({ anonymizedAlerts, attackDiscoveries }) =>
              updateAttackDiscoveries({
                anonymizedAlerts,
                apiConfig,
                attackDiscoveries,
                attackDiscoveryId,
                authenticatedUser,
                dataClient,
                hasFilter: !!(filter && Object.keys(filter).length),
                end,
                latestReplacements,
                logger,
                size,
                start,
                startTime,
                telemetry,
              })
            )
            .catch((err) =>
              handleGraphError({
                apiConfig,
                attackDiscoveryId,
                authenticatedUser,
                dataClient,
                err,
                latestReplacements,
                logger,
                telemetry,
              })
            );

          return response.ok({
            body: currentAd,
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
