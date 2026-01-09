/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';

export async function getToolHandler({
  request,
  dataRegistry,
  start,
  end,
  kqlFilter: kqlFilterValue,
  groupBy,
  latencyType,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  start: string;
  end: string;
  kqlFilter?: string;
  groupBy: string;
  latencyType: 'avg' | 'p95' | 'p99' | undefined;
}) {
  const items = await dataRegistry.getData('traceChangePoints', {
    request,
    start,
    end,
    kqlFilter: kqlFilterValue,
    groupBy,
    latencyType,
  });
  return items;
}
