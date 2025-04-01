/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState, IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';

import { ByteSizeValue } from '@kbn/config-schema';
import { ElasticsearchIndex } from '@kbn/search-connectors';

export const mapIndexStats = (
  indexData: IndicesIndexState,
  indexStats: IndicesStatsIndicesStats,
  indexName: string
): Omit<ElasticsearchIndex, 'count'> & { aliases: string[] } => {
  const aliases = Object.keys(indexData.aliases!);
  const sizeInBytes = new ByteSizeValue(indexStats?.total?.store?.size_in_bytes ?? 0).toString();

  const docCount = indexStats?.total?.docs?.count ?? 0;
  const docDeleted = indexStats?.total?.docs?.deleted ?? 0;
  const total = {
    docs: {
      count: docCount,
      deleted: docDeleted,
    },
    store: {
      size_in_bytes: sizeInBytes,
    },
  };

  return {
    aliases,
    health: indexStats?.health,
    hidden: Boolean(indexData.settings?.index?.hidden),
    name: indexName,
    status: indexStats?.status,
    total,
    uuid: indexStats?.uuid,
  };
};
