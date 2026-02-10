/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { JvmMetricsNode } from '../../data_registry/data_registry_types';

export async function getToolHandler({
  request,
  dataRegistry,
  serviceName,
  serviceEnvironment,
  start,
  end,
  kqlFilter,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  serviceName: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
  kqlFilter?: string;
}): Promise<{ nodes: JvmMetricsNode[] }> {
  const nodes = await dataRegistry.getData('apmApplicationMetrics', {
    request,
    serviceName,
    serviceEnvironment: serviceEnvironment ?? '',
    start,
    end,
    kuery: kqlFilter,
  });

  if (!nodes) {
    throw new Error('Application metrics data is not available.');
  }

  return { nodes };
}
