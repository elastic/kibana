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
import type { StartOAuthResponse, EarsOAuthProvider } from '../../../common/http_api/ears';
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
          provider: schema.oneOf([schema.literal('google')]),
        }),
        body: schema.object({
          scope: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const earsUrl = config.ears?.url;

      if (!earsUrl) {
        return response.customError({
          statusCode: 503,
          body: {
            message: 'EARS integration is not configured',
          },
        });
      }

      const provider = request.params.provider as EarsOAuthProvider;
      const { scope } = request.body;

      try {
        const earsResponse = await fetch(`${earsUrl}/oauth/start/${provider}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scope }),
          dispatcher: insecureAgent,
        });

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

        const data = (await earsResponse.json()) as StartOAuthResponse;

        return response.ok({
          body: data,
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
