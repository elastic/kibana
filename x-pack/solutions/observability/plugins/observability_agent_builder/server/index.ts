/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

import { ObservabilityAgentBuilderPlugin } from './plugin';

export type {
  ObservabilityAgentBuilderPluginSetup,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStartDependencies,
} from './types';

export type { ObservabilityAgentBuilderServerRouteRepository } from './routes/get_global_observability_agent_builder_route_repository';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new ObservabilityAgentBuilderPlugin(initializerContext);
