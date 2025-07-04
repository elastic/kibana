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
  ATTACK_DISCOVERY,
  ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
  getAttackDiscoveryLoadingMessage,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { v4 as uuidv4 } from 'uuid';

import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
} from '../../../../common/constants';
import { getDurationNanoseconds } from './get_duration_nanoseconds';
import { performChecks } from '../../helpers';
import { updateAttackDiscoveryStatusToRunning } from '../helpers/helpers';
import { writeAttackDiscoveryEvent } from './helpers/write_attack_discovery_event';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { requestIsValid } from './helpers/request_is_valid';
import { generateAndUpdateAttackDiscoveries } from '../helpers/generate_and_update_discoveries';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../helpers/index_privileges';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

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
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const { featureFlags } = await context.core;
        const eventLogIndex = (await context.elasticAssistant).eventLogIndex;

        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;
        const savedObjectsClient = assistantContext.savedObjectsClient;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const eventLogger = (await context.elasticAssistant).eventLogger;

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
          const { apiConfig, size } = request.body;

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

          const attackDiscoveryAlertsEnabled = await featureFlags.getBooleanValue(
            ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
            false
          );

          if (attackDiscoveryAlertsEnabled) {
            // Perform alerts access check
            const privilegesCheckResponse = await hasReadWriteAttackDiscoveryAlertsPrivileges({
              context: performChecksContext,
              response,
            });
            if (!privilegesCheckResponse.isSuccess) {
              return privilegesCheckResponse.response;
            }
          }

          const { currentAd, attackDiscoveryId } = await updateAttackDiscoveryStatusToRunning(
            dataClient,
            authenticatedUser,
            apiConfig,
            size
          );

          const executionUuid = attackDiscoveryAlertsEnabled ? uuidv4() : attackDiscoveryId;

          // event log details:
          const connectorId = apiConfig.connectorId;
          const spaceId = (await context.elasticAssistant).getSpaceId();
          const generatedStarted = new Date();
          const loadingMessage = getAttackDiscoveryLoadingMessage({
            alertsCount: size,
            end: request.body.end,
            start: request.body.start,
          });

          await writeAttackDiscoveryEvent({
            action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
            attackDiscoveryAlertsEnabled,
            authenticatedUser,
            connectorId,
            dataClient,
            eventLogger,
            eventLogIndex,
            executionUuid,
            loadingMessage,
            message: `Attack discovery generation ${executionUuid} for user ${authenticatedUser.username} started`,
            spaceId,
            start: generatedStarted,
          });

          // Don't await the results of invoking the graph; (just the metadata will be returned from the route handler):
          generateAndUpdateAttackDiscoveries({
            actionsClient,
            attackDiscoveryAlertsEnabled,
            executionUuid,
            authenticatedUser,
            config: request.body,
            dataClient,
            esClient,
            logger,
            savedObjectsClient,
            telemetry,
          })
            .then(async (result) => {
              const end = new Date();
              const durationNanoseconds = getDurationNanoseconds({
                end,
                start: generatedStarted,
              });

              // NOTE: the (legacy) implementation of generateAttackDiscoveries returns an "error" object when failures occur (instead of rejecting):
              if (result.error == null) {
                await writeAttackDiscoveryEvent({
                  action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
                  alertsContextCount: result.anonymizedAlerts?.length,
                  attackDiscoveryAlertsEnabled,
                  authenticatedUser,
                  connectorId,
                  dataClient,
                  duration: durationNanoseconds,
                  end,
                  eventLogger,
                  eventLogIndex,
                  executionUuid,
                  message: `Attack discovery generation ${executionUuid} for user ${authenticatedUser.username} succeeded`,
                  newAlerts: result.attackDiscoveries?.length ?? 0,
                  outcome: 'success',
                  spaceId,
                });
              } else {
                await writeAttackDiscoveryEvent({
                  action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
                  alertsContextCount: result.anonymizedAlerts?.length,
                  attackDiscoveryAlertsEnabled,
                  authenticatedUser,
                  connectorId,
                  dataClient,
                  duration: durationNanoseconds,
                  end,
                  eventLogger,
                  eventLogIndex,
                  executionUuid,
                  message: `Attack discovery generation ${executionUuid} for user ${authenticatedUser.username} failed: ${result.error?.message}`,
                  outcome: 'failure',
                  reason: result.error?.message,
                  spaceId,
                });
              }
            })
            .catch(async (error) => {
              // This is a fallback in case the promise is rejected (in a future implementation):
              const end = new Date();
              const durationNanoseconds = getDurationNanoseconds({
                end,
                start: generatedStarted,
              });

              await writeAttackDiscoveryEvent({
                action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
                attackDiscoveryAlertsEnabled,
                authenticatedUser,
                connectorId,
                dataClient,
                duration: durationNanoseconds,
                end,
                eventLogger,
                eventLogIndex,
                executionUuid,
                message: `Attack discovery generation ${executionUuid} for user ${authenticatedUser.username} failed: ${error.message}`,
                outcome: 'failure',
                reason: error?.message,
                spaceId,
              });
            });

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
