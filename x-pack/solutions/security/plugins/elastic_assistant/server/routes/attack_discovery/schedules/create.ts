/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import {
  API_VERSIONS,
  CreateAttackDiscoverySchedulesRequestBody,
  CreateAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { transformESSearchToAnonymizationFields } from '../../../ai_assistant_data_clients/anonymization_fields/helpers';
import { EsAnonymizationFieldsSchema } from '../../../ai_assistant_data_clients/anonymization_fields/types';
import { buildResponse } from '../../../lib/build_response';
import {
  ATTACK_DISCOVERY_SCHEDULES,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '../../../../common/constants';
import { ElasticAssistantRequestHandlerContext } from '../../../types';

export const createAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_SCHEDULES,
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
            body: buildRouteValidationWithZod(CreateAttackDiscoverySchedulesRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(CreateAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<CreateAttackDiscoverySchedulesResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const { interval } = request.body;

        try {
          const anonymizationFieldsDataClient =
            await assistantContext.getAIAssistantAnonymizationFieldsDataClient();

          const result =
            await anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
              perPage: 1000,
              page: 1,
            });

          if (!result) {
            return resp.error({
              body: `Failed to load anonymization fields`,
              statusCode: 500,
            });
          }
          const anonymizationFields = transformESSearchToAnonymizationFields(result.data);

          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const scheduleRule = await dataClient.createSchedule({
            name: `[AD] Schedule Rule - ${new Date().getTime()}`,
            alertTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
            enabled: true,
            consumer: 'siem',
            tags: ['attack_discovery'],
            throttle: null,
            params: {
              alertsIndexPattern: '.alerts-security.alerts-default',
              anonymizationFields,
              apiConfig: {
                connectorId: 'gpt-4o',
                actionTypeId: '.gen-ai',
              },
              end: 'now',
              replacements: {},
              size: 100,
              start: 'now-24h',
              subAction: 'invokeAI',
            },
            schedule: { interval },
            actions: [],
            notifyWhen: null,
          });
          logger.info(`Created attack discovery schedule rule: ${scheduleRule.id}`);

          return response.ok({ body: { rule: scheduleRule } });
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
