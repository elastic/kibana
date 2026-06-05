/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { AGENTS_COUNT_PATH } from '../../common/constants';
import type { StartDependencies } from '../types';

type GetStartServices = CoreSetup<StartDependencies>['getStartServices'];

export const registerAgentsCountRoute = (
  router: IRouter,
  logger: Logger,
  getStartServices: GetStartServices
) => {
  router.get(
    {
      path: AGENTS_COUNT_PATH,
      validate: false,
      security: {
        authz: AuthzDisabled.delegateToESClient,
      },
    },
    async (_context, request, response) => {
      try {
        const [, { agentBuilder }] = await getStartServices();
        const registry = await agentBuilder.agents.getRegistry({ request });
        const agents = await registry.list();

        return response.ok({ body: { count: agents.length } });
      } catch (error) {
        logger.warn(`Failed to fetch vectordb agents count: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: { message: 'Failed to fetch agents count' },
        });
      }
    }
  );
};
