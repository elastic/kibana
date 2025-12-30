/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { RedMetricsItem } from '../../data_registry/data_registry_types';

export async function getToolHandler({
  request,
  dataRegistry,
  start,
  end,
  filter,
  groupBy,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  start: string;
  end: string;
  filter?: string;
  groupBy?: string;
}): Promise<{
  items: RedMetricsItem[];
}> {
  const items = await dataRegistry.getData('redMetrics', {
    request,
    start,
    end,
    filter,
    groupBy,
  });

  return {
    items: items ?? [],
  };
}
