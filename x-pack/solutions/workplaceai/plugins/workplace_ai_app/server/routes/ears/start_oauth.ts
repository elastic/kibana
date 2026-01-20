/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { EARS_START_OAUTH_ROUTE } from '../../../common/routes';
import { EarsOAuthProvider, startOAuthResponseSchema } from '../../../common/http_api/ears';
import type { WorkplaceAIAppConfig } from '../../config';

// Create an undici Agent that ignores self-signed certificates (for local dev)
const insecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export function registerStartOAuthRoute({
  router,
  logger,
  config,
}: {
  router: IRouter;
  logger: Logger;
  config: WorkplaceAIAppConfig;
}) {
  router.post(
    {
      path: EARS_START_OAUTH_ROUTE,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: ['workplace_ai_use'],
        },
      },
      validate: {
        params: schema.object({
          provider: schema.oneOf([
            schema.literal(EarsOAuthProvider.Google),
            schema.literal(EarsOAuthProvider.GitHub),
            schema.literal(EarsOAuthProvider.Notion),
            schema.literal(EarsOAuthProvider.Microsoft),
          ]),
        }),
        body: schema.object({
          scope: schema.arrayOf(schema.string(), { maxSize: 100 }),
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

      const provider = request.params.provider as EarsOAuthProvider;

      // Currently only Google is supported
      if (provider !== EarsOAuthProvider.Google) {
        return response.customError({
          statusCode: 400,
          body: {
            message: `Provider '${provider}' is not yet supported. Currently only 'google' is supported.`,
          },
        });
      }
      const { scope } = request.body;

      try {
        const fetchOptions: RequestInit & { dispatcher?: Agent } = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scope }),
        };

        if (allowInsecure) {
          fetchOptions.dispatcher = insecureAgent;
        }

        const earsResponse = await fetch(`${earsUrl}/oauth/start/${provider}`, fetchOptions);

        if (!earsResponse.ok) {
          const errorText = await earsResponse.text();
          const errorMsg = `EARS OAuth start failed: ${earsResponse.status} - ${errorText}`;
          logger.error(errorMsg);
          return response.customError({
            statusCode: earsResponse.status,
            body: {
              message: errorMsg,
            },
          });
        }

        const rawData = await earsResponse.json();
        const parseResult = startOAuthResponseSchema.safeParse(rawData);

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
        const errorMsg = `Failed to connect to EARS at ${earsUrl}: ${error.message}`;
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
