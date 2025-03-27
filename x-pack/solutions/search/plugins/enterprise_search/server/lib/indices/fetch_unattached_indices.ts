/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { Connector, fetchConnectors } from '@kbn/search-connectors';

import { Crawler } from '../../../common/types/crawler';

import { isNotNullish } from '../../../common/utils/is_not_nullish';
import { fetchCrawlers } from '../crawler/fetch_crawlers';

import { getUnattachedIndexData } from './utils/get_index_data';

export const fetchUnattachedIndices = async (
  client: IScopedClusterClient,
  searchQuery: string | undefined,
  from: number,
  size: number
): Promise<{
  indexNames: string[];
  totalResults: number;
}> => {
  const { indexNames } = await getUnattachedIndexData(client, searchQuery);

  let connectors: Connector[] = [];
  let crawlers: Crawler[] = [];
  try {
    crawlers = await fetchCrawlers(client, indexNames);
    connectors = await fetchConnectors(client.asCurrentUser, indexNames);
  } catch (error) {
    connectors = [];
    crawlers = [];
  }

  const connectedIndexNames = [
    ...connectors.map((con) => con.index_name).filter(isNotNullish),
    ...crawlers.map((crawler) => crawler.index_name).filter(isNotNullish),
  ];

  const indexNameSlice = indexNames
    .filter((indexName) => !connectedIndexNames.includes(indexName))
    .filter(isNotNullish)
    .slice(from, from + size);

  if (indexNameSlice.length === 0) {
    return {
      indexNames: [],
      totalResults: indexNames.length,
    };
  }

  return {
    indexNames: indexNameSlice,
    totalResults: indexNames.length,
  };
};
