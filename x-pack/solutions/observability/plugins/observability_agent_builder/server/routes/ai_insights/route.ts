/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';

export function getObservabilityAgentBuilderAiInsightsRouteRepository() {
  const exampleRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'GET /internal/observability_agent_builder/example',
    options: {
      access: 'internal',
    },
    handler: async () => {
      throw new Error('Not implemented');
    },
  });

  return {
    ...exampleRoute,
  };
}
