/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { parseDatemath } from '../../utils/time';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { InfraEntityMetricsItem } from '../../data_registry/data_registry_types';
import { kqlFilter } from '../../utils/dsl_filters';

export async function getToolHandler({
  request,
  dataRegistry,
  start,
  end,
  limit,
  kqlFilter: kqlFilterValue,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  start: string;
  end: string;
  limit: number;
  kqlFilter?: string;
}): Promise<{ hosts: InfraEntityMetricsItem[]; total: number }> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  if (!startMs || !endMs) {
    throw new Error('Invalid date range provided.');
  }

  const query = kqlFilterValue ? { bool: { filter: kqlFilter(kqlFilterValue) } } : undefined;

  const result = await dataRegistry.getData('infraHosts', {
    request,
    from: new Date(startMs).toISOString(),
    to: new Date(endMs).toISOString(),
    limit,
    query,
  });

  if (!result) {
    throw new Error('Host data is not available.');
  }

  return {
    hosts: result.nodes,
    total: result.nodes.length,
  };
}
