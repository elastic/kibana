/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { APP_ID } from '../../../../common';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import {
  AI_POLICIES_URL,
  AI_POLICY_STATUS_URL,
  aiPolicyInputSchema,
  aiPolicyParamsSchema,
  aiPolicyDetectorHeartbeatSchema,
  updateAiPolicyRequestSchema,
} from '../../../../common/entity_intelligence/ai_policies';
import type { EntityAnalyticsRoutesDeps } from '../types';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { AiPolicyError, createAiPolicyDataClient } from './ai_policy_data_client';

export const registerAiPolicyRoutes = ({
  router,
  logger,
}: Pick<EntityAnalyticsRoutesDeps, 'router' | 'logger'>): void => {
  const readSecurity = {
    authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`] },
  };
  const writeSecurity = {
    authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics-manage`] },
  };

  const getClient = async (context: SecuritySolutionRequestHandlerContext) => {
    const core = await context.core;
    const { getSpaceId } = await context.securitySolution;
    return {
      client: createAiPolicyDataClient({
        esClient: core.elasticsearch.client.asCurrentUser,
        spaceId: getSpaceId(),
      }),
      username: core.security.authc.getCurrentUser()?.username,
    };
  };

  const errorResponse = (error: Error, response: KibanaResponseFactory) => {
    const { statusCode, message } = error instanceof AiPolicyError ? error : transformError(error);
    // Do not log policy conditions or collector messages, which can contain sensitive paths.
    logger.warn(`[AiPolicies] Request failed (${statusCode}).`);
    return response.customError({ statusCode, body: message });
  };

  router.versioned
    .get({ access: 'internal', path: AI_POLICIES_URL, security: readSecurity })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: {} },
      async (context, request, response) => {
        try {
          const { client } = await getClient(context);
          return response.ok({ body: await client.listPolicies() });
        } catch (error) {
          return errorResponse(error, response);
        }
      }
    );

  router.versioned
    .post({ access: 'internal', path: AI_POLICIES_URL, security: writeSecurity })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { body: buildRouteValidationWithZod(aiPolicyInputSchema) } },
      },
      async (context, request, response) => {
        try {
          const { client, username } = await getClient(context);
          if (!username) return response.unauthorized();
          return response.ok({
            body: { policy: await client.createPolicy(request.body, username) },
          });
        } catch (error) {
          return errorResponse(error, response);
        }
      }
    );

  router.versioned
    .put({ access: 'internal', path: `${AI_POLICIES_URL}/{id}`, security: writeSecurity })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(aiPolicyParamsSchema),
            body: buildRouteValidationWithZod(updateAiPolicyRequestSchema),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { client, username } = await getClient(context);
          if (!username) return response.unauthorized();
          return response.ok({
            body: { policy: await client.updatePolicy(request.params.id, request.body, username) },
          });
        } catch (error) {
          return errorResponse(error, response);
        }
      }
    );

  router.versioned
    .get({ access: 'internal', path: AI_POLICY_STATUS_URL, security: readSecurity })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: {} },
      async (context, request, response) => {
        try {
          const { client } = await getClient(context);
          return response.ok({ body: await client.getStatus() });
        } catch (error) {
          return errorResponse(error, response);
        }
      }
    );

  router.versioned
    .post({ access: 'internal', path: AI_POLICY_STATUS_URL, security: writeSecurity })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(aiPolicyDetectorHeartbeatSchema) },
        },
      },
      async (context, request, response) => {
        try {
          const { client, username } = await getClient(context);
          if (!username) return response.unauthorized();
          return response.ok({ body: { status: await client.saveStatus(request.body, username) } });
        } catch (error) {
          return errorResponse(error, response);
        }
      }
    );
};
