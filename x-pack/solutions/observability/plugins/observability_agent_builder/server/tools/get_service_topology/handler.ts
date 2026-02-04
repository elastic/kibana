/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ServiceTopologyResponse } from '../../data_registry/data_registry_types';
import type { TopologyDirection } from './tool';

export async function getToolHandler({
  request,
  dataRegistry,
  serviceName,
  environment,
  direction,
  kqlFilter,
  start,
  end,
  includeMetrics,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  serviceName: string;
  environment?: string;
  direction: TopologyDirection;
  kqlFilter?: string;
  start: string;
  end: string;
  includeMetrics: boolean;
}): Promise<ServiceTopologyResponse> {
  const topology = await dataRegistry.getData('apmServiceTopology', {
    request,
    serviceName,
    environment,
    direction,
    kuery: kqlFilter,
    start,
    end,
    includeMetrics,
  });

  if (!topology) {
    return { tracesCount: 0, connections: [] };
  }

  return topology;
}
