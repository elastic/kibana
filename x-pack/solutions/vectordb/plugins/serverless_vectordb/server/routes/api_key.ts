/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';

const ONBOARDING_KEY_NAME_PREFIX = 'vectordb-onboarding-';

export const registerCreateApiKeyRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: '/internal/serverless_vectordb/api_key',
      validate: {
        body: schema.object({
          name: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
      security: {
        authz: AuthzDisabled.delegateToESClient,
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const existing = await client.security.getApiKey({
          name: `${ONBOARDING_KEY_NAME_PREFIX}*`,
        });

        const now = Date.now();
        const hasActiveKey = existing.api_keys.some(
          (k) => !k.invalidated && (!k.expiration || k.expiration > now)
        );

        if (hasActiveKey) {
          return response.ok({ body: { id: null, name: null, encoded: null } });
        }

        const name = request.body.name ?? `${ONBOARDING_KEY_NAME_PREFIX}${Date.now()}`;
        const result = await client.security.createApiKey({ name });
        return response.ok({
          body: { id: result.id, name, encoded: result.encoded },
        });
      } catch (error) {
        logger.warn(`Failed to create vectordb onboarding API key: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: { message: 'Failed to create API key' },
        });
      }
    }
  );
};
