/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { EARS_REVOKE_TOKEN_ROUTE } from '../../../common/routes';
import { EarsOAuthProvider } from '../../../common/http_api/ears';
import type { WorkplaceAIAppConfig } from '../../config';

// Create an undici Agent that ignores self-signed certificates (for local dev)
const insecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export function registerRevokeTokenRoute({
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
      path: EARS_REVOKE_TOKEN_ROUTE,
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
          token: schema.string(),
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

      const { provider } = request.params;

      const { token } = request.body;

      try {
        const fetchOptions: RequestInit & { dispatcher?: Agent } = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        };

        if (allowInsecure) {
          fetchOptions.dispatcher = insecureAgent;
        }

        const earsResponse = await fetch(`${earsUrl}/${provider}/oauth/revoke`, fetchOptions);

        if (!earsResponse.ok) {
          const errorText = await earsResponse.text();
          const errorMsg = `EARS revoking token failed: ${earsResponse.status} - ${errorText}`;
          logger.error(errorMsg);
          return response.customError({
            statusCode: earsResponse.status,
            body: {
              message: errorMsg,
            },
          });
        }

        return response.ok();
      } catch (error) {
        const errorMsg = `EARS revoke token error: ${error}`;
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
