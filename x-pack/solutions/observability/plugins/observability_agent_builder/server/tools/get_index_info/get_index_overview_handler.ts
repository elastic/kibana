/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { getDataStreamsHandler, type DataStreamInfo } from './get_data_streams_handler';

export interface IndexPatternsResult {
  indexPatterns: {
    apm: { transaction: string; span: string; error: string; metric: string };
    logs: string[];
    metrics: string[];
    alerts: string[];
  };
  /** Discovered data streams for targeted field discovery */
  dataStreams: DataStreamInfo[];
}

/**
 * Returns observability index patterns and discovered data streams.
 * The data streams help identify what specific datasets exist in the cluster,
 * enabling more targeted field discovery (e.g., query metrics-system.memory-* for memory fields).
 */
export async function getIndexPatternsHandler({
  core,
  plugins,
  esClient,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  esClient: IScopedClusterClient;
  logger: Logger;
}): Promise<IndexPatternsResult> {
  const dataSources = await getObservabilityDataSources({ core, plugins, logger });
  const dataStreams = await getDataStreamsHandler({ esClient, dataSources, logger });

  return {
    indexPatterns: {
      apm: {
        transaction: dataSources.apmIndexPatterns.transaction,
        span: dataSources.apmIndexPatterns.span,
        error: dataSources.apmIndexPatterns.error,
        metric: dataSources.apmIndexPatterns.metric,
      },
      logs: dataSources.logIndexPatterns,
      metrics: dataSources.metricIndexPatterns,
      alerts: dataSources.alertsIndexPattern,
    },
    dataStreams,
  };
}
