/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';

export function getObservabilityAgentBuilderAiInsightsRouteRepository() {
  const exampleRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/example',
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
        id: t.string,
      }),
    }),
    handler: async ({ params }) => {
      return { id: params.body.id };
    },
  });

  return {
    ...exampleRoute,
  };
}
