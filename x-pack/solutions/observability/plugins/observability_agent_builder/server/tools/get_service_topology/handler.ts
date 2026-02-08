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
  direction,
  start,
  end,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  serviceName: string;
  direction: TopologyDirection;
  start: string;
  end: string;
}): Promise<ServiceTopologyResponse> {
  const topology = await dataRegistry.getData('apmServiceTopology', {
    request,
    serviceName,
    direction,
    start,
    end,
  });

  if (!topology) {
    return { connections: [] };
  }

  return topology;
}
