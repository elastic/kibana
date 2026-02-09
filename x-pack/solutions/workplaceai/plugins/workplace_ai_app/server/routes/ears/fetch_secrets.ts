/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { EARS_FETCH_SECRETS_ROUTE } from '../../../common/routes';
import { fetchSecretsResponseSchema } from '../../../common/http_api/ears';
import type { WorkplaceAIAppConfig } from '../../config';

// Create an undici Agent that ignores self-signed certificates (for local dev)
const insecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export function registerFetchSecretsRoute({
  router,
  logger,
  config,
}: {
  router: IRouter;
  logger: Logger;
  config: WorkplaceAIAppConfig;
}) {
  router.get(
    {
      path: EARS_FETCH_SECRETS_ROUTE,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: ['workplace_ai_use'],
        },
      },
      validate: {
        query: schema.object({
          request_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const earsUrl = config.ears?.url;
      const allowInsecure = config.ears?.allow_insecure ?? true;

      if (!earsUrl) {
        return response.customError({
          statusCode: 503,
          body: {
            message: 'EARS integration is not configured',
          },
        });
      }

      const { request_id: requestId } = request.query;

      try {
        const fetchOptions: RequestInit & { dispatcher?: Agent } = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (allowInsecure) {
          fetchOptions.dispatcher = insecureAgent;
        }

        const earsResponse = await fetch(
          `${earsUrl}/oauth/fetch_request_secrets?request_id=${encodeURIComponent(requestId)}`,
          fetchOptions
        );

        if (!earsResponse.ok) {
          const errorText = await earsResponse.text();
          const errorMsg = `EARS fetch secrets failed: ${earsResponse.status} - ${errorText}`;
          logger.error(errorMsg);
          return response.customError({
            statusCode: earsResponse.status,
            body: {
              message: errorMsg,
            },
          });
        }

        const rawData = await earsResponse.json();
        const parseResult = fetchSecretsResponseSchema.safeParse(rawData);

        if (!parseResult.success) {
          const errorMsg = `Invalid response from EARS: ${parseResult.error.message}`;
          logger.error(errorMsg);
          return response.customError({
            statusCode: 502,
            body: {
              message: errorMsg,
            },
          });
        }

        return response.ok({
          body: parseResult.data,
        });
      } catch (error) {
        const errorMsg = `EARS fetch secrets error: ${error}`;
        logger.error(errorMsg);
        return response.customError({
          statusCode: 500,
          body: {
            message: errorMsg,
          },
        });
      }
    }
  );
}
