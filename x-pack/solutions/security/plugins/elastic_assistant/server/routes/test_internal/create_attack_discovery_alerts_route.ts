/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { API_VERSIONS, CreateAttackDiscoveryAlertsParams } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { ElasticAssistantPluginRouter } from '../../types';

const RESPONSE_SCHEMA = z.object({ data: z.array(z.unknown()) });

const isPrivilegedDataGeneratorUser = (user: AuthenticatedUser | null | undefined): boolean => {
  if (!user) return false;
  if (user.roles?.includes('superuser')) return true;
  // Kibana may authenticate API-key requests as `_es_api_key` with no Kibana roles in serverless.
  // Treat API-key auth as privileged for this dev-only route (still gated at route registration time).
  if (user.authentication_type === 'api_key') return true;
  if (user.authentication_realm?.name === '_es_api_key') return true;
  if (user.api_key?.id) return true;
  return false;
};

const hasInternalKibanaOriginHeader = (headerValue: unknown): boolean => {
  // `@kbn/test`'s KbnClient overwrites this header to `kbn-client` (see `buildRequest()`),
  // while browser/internal calls commonly use `Kibana`.
  const allowed = new Set(['Kibana', 'kbn-client']);
  if (typeof headerValue === 'string') return allowed.has(headerValue);
  if (Array.isArray(headerValue)) return headerValue.some((v) => allowed.has(v));
  return false;
};

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
          reason:
            'dev-only route for data generator; gated by route registration + internal-origin header',
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

          // This route is dev-only, but still requires an internal-origin request and a privileged user.
          // The data generator script sends this header.
          const internalOrigin = request.headers['x-elastic-internal-origin'];
          if (!hasInternalKibanaOriginHeader(internalOrigin)) {
            return response.forbidden({
              body: { message: 'Missing required x-elastic-internal-origin: Kibana header' },
            });
          }

          // Avoid relying solely on a spoofable header. This route is dev/staff-only at registration time,
          // but also requires a superuser-equivalent principal in practice (works in serverless API key flows).
          if (!isPrivilegedDataGeneratorUser(authenticatedUser)) {
            return response.forbidden({
              body: { message: 'Data generator route requires a privileged user' },
            });
          }

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
            body: { message: error.message },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
