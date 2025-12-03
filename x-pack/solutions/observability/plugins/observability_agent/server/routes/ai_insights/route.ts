/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { fetchApmErrorContext } from './apm_error/fetch_apm_error_context';
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
    handler: async ({ request, core, dataRegistry, params }) => {
      const { errorId, serviceName, start, end, environment = '', connectorId } = params.body;

      const [_, pluginsStart] = await core.getStartServices();

      const context = await fetchApmErrorContext({
        dataRegistry,
        request,
        serviceName,
        environment: environment ?? '',
        start,
        end,
        errorId,
      });

      const summary = await generateErrorAiInsight({
        inferenceStart: pluginsStart.inference,
        request,
        connectorId: connectorId ?? undefined,
        context,
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
