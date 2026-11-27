/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getLogsIndices } from './get_logs_indices';
import { getMetricsIndices } from './get_metrics_indices';
import { getApmIndices } from './get_apm_indices';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';

export interface ObservabilityDataSources {
  apmIndexPatterns: APMIndices;
  logIndexPatterns: string[];
  metricIndexPatterns: string[];
  alertsIndexPattern: string[];
}

export async function getObservabilityDataSources({
  core,
  plugins,
  request,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ObservabilityDataSources> {
  const apmIndexPatterns = await getApmIndices({ core, plugins, request, logger });
  const logIndexPatterns = await getLogsIndices({ core, request, logger });
  const metricIndexPatterns = await getMetricsIndices({ core, plugins, request, logger });
  const alertsIndexPattern = ['.alerts-observability.*'];

  return {
    apmIndexPatterns,
    logIndexPatterns,
    metricIndexPatterns,
    alertsIndexPattern,
  };
}
