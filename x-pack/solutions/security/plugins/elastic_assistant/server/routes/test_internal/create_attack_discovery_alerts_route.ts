/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { ElasticAssistantPluginRouter } from '../../types';
import { API_VERSIONS, CreateAttackDiscoveryAlertsParams } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';

const RESPONSE_SCHEMA = z.object({ data: z.array(z.unknown()) });

/**
 * Dev-only route used by the Security Solution data generator script.
 *
 * In serverless, the ad-hoc Attack Discovery store is a system data stream/index that cannot be created
 * via the Elasticsearch API by end users. This route writes via the Elastic Assistant rule-data client,
 * which can bootstrap the backing store as needed.
 */
export const createAttackDiscoveryAlertsRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/elastic_assistant/data_generator/attack_discoveries/_create',
      security: {
        authz: {
          enabled: false,
          reason: 'dev-only route for data generator',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(CreateAttackDiscoveryAlertsParams) },
          response: { 200: { body: { custom: buildRouteValidationWithZod(RESPONSE_SCHEMA) } } },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const assistantContext = await context.elasticAssistant;
          const authenticatedUser = await assistantContext.getCurrentUser();
          if (!authenticatedUser) return response.unauthorized();

          const dataClient = await assistantContext.getAttackDiscoveryDataClient();
          if (!dataClient) {
            return response.customError({
              statusCode: 500,
              body: { message: 'Attack discovery data client not initialized' },
            });
          }

          const data = await dataClient.createAttackDiscoveryAlertsForDataGenerator({
            authenticatedUser,
            createAttackDiscoveryAlertsParams: request.body,
          });

          return response.ok({ body: { data } });
        } catch (e) {
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
