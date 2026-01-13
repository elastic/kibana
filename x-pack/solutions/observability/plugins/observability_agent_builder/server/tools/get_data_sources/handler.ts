/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';

export async function getToolHandler({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  const {
    apmIndexPatterns: apmIndices,
    logIndexPatterns,
    metricIndexPatterns,
    alertsIndexPattern,
  } = await getObservabilityDataSources({ core, plugins, logger });

  return {
    apm: {
      indexPatterns: apmIndices,
    },
    logs: {
      indexPatterns: logIndexPatterns,
    },
    metrics: {
      indexPatterns: metricIndexPatterns,
    },
    alerts: {
      indexPattern: alertsIndexPattern,
    },
  };
}
