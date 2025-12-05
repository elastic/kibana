/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';
import type { CoreSetup } from '@kbn/core/server';
import type { ObservabilityAgentDataRegistry } from '../data_registry/data_registry';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

export interface ObservabilityAgentBuilderRouteHandlerResources
  extends DefaultRouteHandlerResources {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  dataRegistry: ObservabilityAgentDataRegistry;
}

export const createObservabilityAgentBuilderServerRoute = createServerRouteFactory<
  ObservabilityAgentBuilderRouteHandlerResources,
  undefined
>();
