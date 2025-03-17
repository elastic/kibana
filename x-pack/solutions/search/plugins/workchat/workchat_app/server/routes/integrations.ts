/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  ListIntegrationsResponse,
  GetIntegrationResponse,
  CreateIntegrationResponse,
  UpdateIntegrationResponse,
  DeleteIntegrationResponse,
} from '../../common/http_api/integrations';
import type { RouteDependencies } from './types';

export const registerIntegrationsRoutes = ({ getServices, router }: RouteDependencies) => {
  // Get a single integration by ID
  router.get(
    {
      path: '/internal/workchat/integrations/{integrationId}',
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { integrationId } = request.params;

      const integration = await client.get({ integrationId });

      return res.ok<GetIntegrationResponse>({
        body: integration,
      });
    }
  );

  // List all integrations
  router.get(
    {
      path: '/internal/workchat/integrations',
      validate: {},
    },
    async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const integrations = await client.list();

      return res.ok<ListIntegrationsResponse>({
        body: {
          integrations,
        },
      });
    }
  );

  // Create a new integration
  router.post(
    {
      path: '/internal/workchat/integrations',
      validate: {
        body: schema.object({
          type: schema.string(),
          description: schema.string(),
          configuration: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { type, description, configuration } = request.body;

      const integration = await client.create({
        type,
        description,
        configuration,
      });

      return res.ok<CreateIntegrationResponse>({
        body: integration,
      });
    }
  );

  // Update an existing integration
  router.put(
    {
      path: '/internal/workchat/integrations/{integrationId}',
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
        body: schema.object({
          description: schema.maybe(schema.string()),
          configuration: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { integrationId } = request.params;
      const { description, configuration } = request.body;

      const integration = await client.update(integrationId, {
        description,
        configuration,
      });

      return res.ok<UpdateIntegrationResponse>({
        body: integration,
      });
    }
  );

  // Delete an integration
  router.delete(
    {
      path: '/internal/workchat/integrations/{integrationId}',
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      const { integrationsService } = getServices();
      const client = await integrationsService.getScopedClient({ request });

      const { integrationId } = request.params;

      await client.delete(integrationId);

      return res.ok<DeleteIntegrationResponse>({
        body: {
          success: true,
        },
      });
    }
  );
};
