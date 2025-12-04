/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import type { ObservabilityAgentDataRegistry } from '../data_registry/data_registry';
import { getGlobalObservabilityAgentBuilderServerRouteRepository } from './get_global_observability_agent_builder_route_repository';

export function registerServerRoutes({
  core,
  logger,
  dataRegistry,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
  dataRegistry: ObservabilityAgentDataRegistry;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalObservabilityAgentBuilderServerRouteRepository(),
    dependencies: {
      core,
      dataRegistry,
    },
    runDevModeChecks: false,
  });
}
