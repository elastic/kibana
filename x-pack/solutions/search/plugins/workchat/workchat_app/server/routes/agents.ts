/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  GetAgentResponse,
  ListAgentResponse,
  CreateAgentResponse,
  CreateAgentPayload,
} from '../../common/http_api/agents';
import type { RouteDependencies } from './types';

export const registerAgentRoutes = ({ getServices, router, logger }: RouteDependencies) => {
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
        body: schema.object({
          name: schema.string(),
          description: schema.string(),
          configuration: schema.object({
            systemPrompt: schema.maybe(schema.string()),
          }),
        }),
      },
    },
    async (ctx, request, res) => {
      try {
        const payload: CreateAgentPayload = request.body;

        const { agentService } = getServices();
        const client = await agentService.getScopedClient({ request });

        // TODO: validation

        const agent = await client.create(payload);

        return res.ok<CreateAgentResponse>({
          body: {
            success: true,
            agent,
          },
        });
      } catch (e) {
        logger.error(e);
        throw e;
      }
    }
  );

  router.put(
    {
      path: '/internal/workchat/agents/{agentId}',
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
        body: schema.object({
          name: schema.string(),
          description: schema.string(),
          configuration: schema.object({
            systemPrompt: schema.maybe(schema.string()),
          }),
        }),
      },
    },
    async (ctx, request, res) => {
      try {
        const { agentId } = request.params;
        const payload: CreateAgentPayload = request.body;

        const { agentService } = getServices();
        const client = await agentService.getScopedClient({ request });

        // TODO: validation

        const agent = await client.update(agentId, payload);

        return res.ok<CreateAgentResponse>({
          body: {
            success: true,
            agent,
          },
        });
      } catch (e) {
        logger.error(e);
        throw e;
      }
    }
  );

  router.get(
    {
      path: '/internal/workchat/agents',
      validate: false,
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
