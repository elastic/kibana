/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';

export interface ObservabilityAgentBuilderRouteHandlerResources
  extends DefaultRouteHandlerResources {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}

export const createObservabilityAgentBuilderServerRoute = createServerRouteFactory<
  ObservabilityAgentBuilderRouteHandlerResources,
  undefined
>();
