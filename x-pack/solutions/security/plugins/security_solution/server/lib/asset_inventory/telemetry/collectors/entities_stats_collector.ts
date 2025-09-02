/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export interface EntityStats {
  doc_count: number;
  last_doc_timestamp: string | null;
}

const getIndexDocCount = (esClient: ElasticsearchClient, index: string) =>
  esClient.indices.stats({ index });

const getLatestDocTimestamp = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<string | null> => {
  const latestTimestamp = await esClient.search({
    index,
    query: {
      match_all: {},
    },
    sort: '@timestamp:desc',
    size: 1,
    fields: ['@timestamp'],
    _source: false,
  });

  const latestEventTimestamp = latestTimestamp.hits?.hits[0]?.fields;

  return latestEventTimestamp ? latestEventTimestamp['@timestamp'][0] : null;
};

export const getEntityStats = async (
  esClient: ElasticsearchClient,
  index: string,
  logger: Logger
): Promise<EntityStats | {}> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index,
    });

    if (isIndexExists) {
      const indexStats = await getIndexDocCount(esClient, index);
      return {
        doc_count: indexStats._all.primaries?.docs ? indexStats._all.primaries?.docs?.count : 0,
        last_doc_timestamp: await getLatestDocTimestamp(esClient, index),
      };
    }

    return {};
  } catch (e) {
    logger.error(`Failed to get index stats for ${index}`);
    return {};
  }
};
