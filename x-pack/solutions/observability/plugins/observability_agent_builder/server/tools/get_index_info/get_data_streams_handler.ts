/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { sortBy } from 'lodash';
import type { ObservabilityDataSources } from '../../utils/get_observability_data_sources';

/** Information about an individual data stream */
export interface DataStreamInfo {
  /** Full data stream name (e.g., "metrics-system.memory-default") */
  name: string;
  /** Dataset extracted from name (e.g., "system.memory") */
  dataset: string;
}

/**
 * Extracts the dataset from a data stream name.
 * Data stream names follow the pattern: {type}-{dataset}-{namespace}
 * e.g., "metrics-system.memory-default" -> "system.memory"
 */
function extractDataset(name: string): string {
  const parts = name.split('-');
  return parts.slice(1, -1).join('-');
}

/**
 * Discovers observability data streams in the cluster.
 * Returns a flat list of data streams with their datasets, sorted by name.
 *
 * Uses the configured observability index patterns (from getObservabilityDataSources)
 * to ensure consistency and support for CCS (Cross-Cluster Search) if configured.
 *
 * @example
 * // Returns:
 * [
 *   { name: "logs-apm.error-default", dataset: "apm.error" },
 *   { name: "metrics-system.cpu-default", dataset: "system.cpu" },
 *   { name: "traces-apm-default", dataset: "apm" }
 * ]
 */
export async function getDataStreamsHandler({
  esClient,
  dataSources,
  logger,
}: {
  esClient: IScopedClusterClient;
  dataSources: ObservabilityDataSources;
  logger: Logger;
}): Promise<DataStreamInfo[]> {
  try {
    // Build pattern from configured observability index patterns (supports CCS)
    const indexPatterns = [
      ...dataSources.logIndexPatterns,
      ...dataSources.metricIndexPatterns,
      dataSources.apmIndexPatterns.transaction,
      dataSources.apmIndexPatterns.span,
    ].join(',');

    const response = await esClient.asCurrentUser.indices.getDataStream({ name: indexPatterns });

    return sortBy(
      response.data_streams.map((ds) => ({ name: ds.name, dataset: extractDataset(ds.name) })),
      'name'
    );
  } catch (error) {
    logger.error(`Error retrieving data streams: ${error}`);
    return [];
  }
}
