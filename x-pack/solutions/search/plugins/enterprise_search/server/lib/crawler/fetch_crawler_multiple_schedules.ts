/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, Connector } from '@kbn/search-connectors';

const CUSTOM_SCHEDULING = 'custom_scheduling';

export const fetchCrawlerCustomSchedulingByIndexName = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<Connector | undefined> => {
  const crawlerResult = await client.asCurrentUser.search<Connector>({
    index: CONNECTORS_INDEX,
    query: { term: { index_name: indexName } },
    _source: CUSTOM_SCHEDULING,
  });
  const result = crawlerResult.hits.hits[0]?._source;
  return result;
};

export const fetchCrawlerCustomSchedulingKeysByIndexName = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<string[]> => {
  const crawlerCustomSchedules = await fetchCrawlerCustomSchedulingByIndexName(client, indexName);

  return crawlerCustomSchedules?.custom_scheduling
    ? Object.keys(crawlerCustomSchedules.custom_scheduling)
    : [];
};
