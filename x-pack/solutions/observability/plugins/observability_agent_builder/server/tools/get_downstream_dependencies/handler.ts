/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { APMDownstreamDependency } from '../../data_registry/data_registry_types';

export async function getToolHandler({
  request,
  dataRegistry,
  serviceName,
  serviceEnvironment,
  start,
  end,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  serviceName: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
}): Promise<{ dependencies: APMDownstreamDependency[] | undefined }> {
  const dependencies = await dataRegistry.getData('apmDownstreamDependencies', {
    request,
    serviceName,
    serviceEnvironment: serviceEnvironment ?? '',
    start,
    end,
  });

  return { dependencies };
}
