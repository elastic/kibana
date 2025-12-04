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
        environment: t.union([t.string, t.undefined, t.null]),
        kuery: t.union([t.string, t.undefined, t.null]),
        connectorId: t.union([t.string, t.undefined, t.null]),
      }),
    }),
    handler: async ({ request, core, dataRegistry, params, logger }) => {
      const { errorId, serviceName, start, end, environment = '', connectorId } = params.body;

      const [_, pluginsStart] = await core.getStartServices();

      const { summary, context } = await generateErrorAiInsight({
        connectorId: connectorId ?? undefined,
        errorId,
        serviceName,
        start,
        end,
        environment: environment ?? '',
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
