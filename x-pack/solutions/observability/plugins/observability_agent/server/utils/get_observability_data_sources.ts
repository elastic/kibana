/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getLogsIndices } from './get_logs_indices';
import { getMetricsIndices } from './get_metrics_indices';
import { getApmIndices } from './get_apm_indices';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

export async function getObservabilityDataSources({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}): Promise<{
  apmIndexPatterns: APMIndices;
  logIndexPatterns: string[];
  metricIndexPatterns: string[];
  alertsIndexPattern: string[];
}> {
  const apmIndexPatterns = await getApmIndices({ core, plugins, logger });
  const logIndexPatterns = await getLogsIndices({ core, logger });
  const metricIndexPatterns = await getMetricsIndices({ core, plugins, logger });
  const alertsIndexPattern = ['alerts-observability-*'];

  return {
    apmIndexPatterns,
    logIndexPatterns,
    metricIndexPatterns,
    alertsIndexPattern,
  };
}
