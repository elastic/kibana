/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { GetAgentResponse, ListAgentResponse } from '../../common/http_api/agents';
import type { RouteDependencies } from './types';

export const registerAgentRoutes = ({ getServices, router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/workchat/agents/{agentId}',
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      const { agentId } = request.params;

      const agent = await client.get({ agentId });

      return res.ok<GetAgentResponse>({
        body: agent,
      });
    }
  );

  router.post(
    {
      path: '/internal/workchat/agents',
      validate: {
        body: schema.object({}),
      },
    },
    async (ctx, request, res) => {
      const { agentService } = getServices();
      const client = await agentService.getScopedClient({ request });

      const agents = await client.list();

      return res.ok<ListAgentResponse>({
        body: {
          agents,
        },
      });
    }
  );
};
