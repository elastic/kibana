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
  ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
  ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
  PostAttackDiscoveryGenerationsDismissRequestParams,
  PostAttackDiscoveryGenerationsDismissResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED } from '../../../../common/constants';
import { performChecks } from '../../helpers';
import { writeAttackDiscoveryEvent } from './helpers/write_attack_discovery_event';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';

export const postAttackDiscoveryGenerationsDismissRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
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
            params: buildRouteValidationWithZod(PostAttackDiscoveryGenerationsDismissRequestParams),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(PostAttackDiscoveryGenerationsDismissResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostAttackDiscoveryGenerationsDismissResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const { featureFlags } = await context.core;
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

        try {
          const eventLogIndex = (await context.elasticAssistant).eventLogIndex;
          const eventLogger = (await context.elasticAssistant).eventLogger;
          const spaceId = (await context.elasticAssistant).getSpaceId();
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const currentUser = await checkResponse.currentUser;
          const executionUuid = request.params.execution_uuid;

          const attackDiscoveryAlertsEnabled = await featureFlags.getBooleanValue(
            ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
            false
          );

          const previousGeneration = await dataClient.getAttackDiscoveryGenerationById({
            authenticatedUser: currentUser,
            eventLogIndex,
            executionUuid,
            logger,
            spaceId,
          });

          // event log details:
          const connectorId = previousGeneration.connector_id;

          writeAttackDiscoveryEvent({
            action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED,
            attackDiscoveryAlertsEnabled,
            authenticatedUser: currentUser,
            connectorId,
            eventLogger,
            executionUuid,
            loadingMessage: undefined,
            message: `Attack discovery generation ${executionUuid} for user ${currentUser.username} started`,
            spaceId,
          });

          const latestGeneration = await dataClient.getAttackDiscoveryGenerationById({
            authenticatedUser: currentUser,
            eventLogIndex,
            executionUuid,
            logger,
            spaceId,
          });

          return response.ok({
            body: {
              ...latestGeneration,
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
