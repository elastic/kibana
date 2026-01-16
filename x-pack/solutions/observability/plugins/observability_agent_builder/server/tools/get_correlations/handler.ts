/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';

export async function getToolHandler({
  core,
  plugins,
  request,
  dataRegistry,
  logger,
  start,
  end,
  kqlFilter,
  type,
  serviceName,
  transactionName,
  transactionType,
  environment,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  start: string;
  end: string;
  kqlFilter?: string;
  type: 'latency' | 'failures';
  serviceName: string;
  transactionName: string;
  transactionType: string;
  environment: string;
}) {
  const correlations = await dataRegistry.getData('apmCorrelations', {
    request,
    start,
    end,
    kqlFilter,
    type,
    serviceName,
    transactionName,
    transactionType,
    environment,
  });

  return correlations;
}
