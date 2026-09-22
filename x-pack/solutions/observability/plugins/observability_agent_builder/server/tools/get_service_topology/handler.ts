/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import type { TopologyDirection, ServiceTopologyResponse } from './types';
import { getServiceTopology } from './get_service_topology';

export function getToolHandler({
  core,
  plugins,
  request,
  dataRegistry,
  logger,
  serviceName,
  direction,
  depth,
  start,
  end,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
  serviceName: string;
  direction: TopologyDirection;
  depth?: number;
  start: string;
  end: string;
}): Promise<ServiceTopologyResponse> {
  return getServiceTopology({
    core,
    plugins,
    dataRegistry,
    request,
    logger,
    serviceName,
    direction,
    depth,
    start,
    end,
  });
}
