/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { generateErrorAiInsight } from './apm_error/generate_error_ai_insight';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';

export function getObservabilityAgentBuilderAiInsightsRouteRepository() {
  const errorAiInsightsRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/error',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readOnechat],
      },
    },
    params: t.type({
      body: t.type({
        serviceName: t.string,
        errorId: t.string,
        start: t.string,
        end: t.string,
        environment: t.union([t.string, t.undefined]),
        kuery: t.union([t.string, t.undefined]),
        connectorId: t.union([t.string, t.undefined]),
        traceId: t.union([t.string, t.undefined]),
      }),
    }),
    handler: async ({ request, core, plugins, dataRegistry, params, logger }) => {
      const {
        errorId,
        serviceName,
        start,
        end,
        environment = '',
        connectorId: lastUsedConnectorId,
        traceId,
      } = params.body;

      const [_, pluginsStart] = await core.getStartServices();

      let connectorId = lastUsedConnectorId;
      if (!connectorId) {
        const defaultConnector = await pluginsStart.inference.getDefaultConnector(request);
        connectorId = defaultConnector?.connectorId;
      }

      if (!connectorId) {
        throw new Error('No default connector found');
      }

      const { summary, context } = await generateErrorAiInsight({
        core,
        plugins,
        connectorId,
        errorId,
        serviceName,
        start,
        end,
        environment,
        traceId,
        dataRegistry,
        request,
        inferenceStart: pluginsStart.inference,
        logger,
      });

      return {
        context,
        summary,
      };
    },
  });

  return {
    ...errorAiInsightsRoute,
  };
}
