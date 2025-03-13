/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
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
import { ALERT_UUID } from '@kbn/rule-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
} from '../../../lib/attack_discovery/schedules/field_names';
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
          const authenticatedUser = await assistantContext.getCurrentUser();
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
            .then(({ anonymizedAlerts, attackDiscoveries }) => {
              const now = new Date().toISOString();
              const alerts = attackDiscoveries?.map((attack) => {
                return {
                  '@timestamp': now,
                  [ALERT_UUID]: uuidv4(),
                  [ALERT_ATTACK_DISCOVERY_USERS]: [
                    {
                      id: authenticatedUser.profile_uid,
                      name: authenticatedUser.username,
                    },
                  ],
                  [ALERT_ATTACK_DISCOVERY_TITLE]: attack.title,
                  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: attack.detailsMarkdown,
                  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: attack.entitySummaryMarkdown,
                  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: attack.summaryMarkdown,
                  [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: attack.mitreAttackTactics,
                  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: attack.alertIds,
                  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: replacements,
                  [ALERT_ATTACK_DISCOVERY_API_CONFIG]: apiConfig,
                  [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: anonymizedAlerts.length,
                };
              });
              const bulkOperations = alerts?.flatMap((alert) => [
                {
                  create: {
                    _id: alert[ALERT_UUID],
                    _index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
                  },
                },
                alert,
              ]);
              if (bulkOperations) {
                esClient
                  .bulk({
                    // index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
                    body: bulkOperations,
                    refresh: true,
                  })
                  .then((results) => {
                    logger.info(`[AD] Ad-hoc attack discoveries: ${JSON.stringify(results)}`);
                  });
              }
              return updateAttackDiscoveries({
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
              });
            })
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
