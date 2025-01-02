/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isNotNullish } from '../../../common/utils/is_not_nullish';
import { isHidden, isClosed } from '../../utils/index_utils';

export async function fetchIndices(
  client: ElasticsearchClient,
  from: number,
  size: number,
  searchQuery?: string
) {
  const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
  const indexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute settings of indices but not mappings
    features: ['aliases', 'settings'],
    index: indexPattern,
  });
  const indexNames = Object.keys(indexMatches).filter(
    (indexName) =>
      indexMatches[indexName] &&
      !isHidden(indexMatches[indexName]) &&
      !isClosed(indexMatches[indexName])
  );
  const indexNameSlice = indexNames.slice(from, from + size).filter(isNotNullish);
  if (indexNameSlice.length === 0) {
    return [];
  }
  const indexCounts = await fetchIndexCounts(client, indexNameSlice);
  return indexNameSlice.map((name) => ({
    name,
    count: indexCounts[name]?.total?.docs?.count ?? 0,
  }));
}

const fetchIndexCounts = async (
  client: ElasticsearchClient,
  indicesNames: string[]
): Promise<Record<string, IndicesStatsIndicesStats | undefined>> => {
  if (indicesNames.length === 0) {
    return {};
  }
  const indexCounts: Record<string, IndicesStatsIndicesStats | undefined> = {};
  // batch calls in batches of 100 to prevent loading too much onto ES
  for (let i = 0; i < indicesNames.length; i += 100) {
    const stats = await client.indices.stats({
      index: indicesNames.slice(i, i + 100),
      metric: ['docs'],
    });
    Object.assign(indexCounts, stats.indices);
  }
  return indexCounts;
};
