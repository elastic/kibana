/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';
import { sortBy } from 'lodash';
import type { ObservabilityDataSources } from '../../utils/get_observability_data_sources';

/** Information about an individual data stream */
export interface DataStreamInfo {
  /** Full data stream name (e.g., "metrics-system.memory-default") */
  name: string;
  /** Dataset extracted from name (e.g., "system.memory") */
  dataset: string;
}

const STREAM_TYPES = ['logs', 'metrics', 'traces'] as const;

const STREAMS_DOT_PATTERNS = STREAM_TYPES.map((type) => `${type}.*`);

/** Extracts dataset from classic Fleet ({type}-{dataset}-{namespace}) or Streams dot names (logs.ecs.nginx). */
export function extractDataset(name: string): string {
  for (const type of STREAM_TYPES) {
    if (name.startsWith(`${type}.`)) {
      return name.slice(type.length + 1);
    }
  }

  const parts = name.split('-');
  if (parts.length >= 3) {
    return parts.slice(1, -1).join('-');
  }

  return name;
}

/** Discovers observability data streams via _resolve_index (same as platform.core.list_indices). */
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
    const pattern = [
      ...dataSources.logIndexPatterns,
      ...dataSources.metricIndexPatterns,
      dataSources.apmIndexPatterns.transaction,
      dataSources.apmIndexPatterns.span,
      ...STREAMS_DOT_PATTERNS,
    ].join(',');

    const { data_streams: dataStreams } = await listSearchSources({
      pattern,
      esClient: esClient.asCurrentUser,
    });

    return sortBy(
      dataStreams.map((ds) => ({ name: ds.name, dataset: extractDataset(ds.name) })),
      'name'
    );
  } catch (error) {
    logger.error(`Error retrieving data streams: ${error}`);
    return [];
  }
}
