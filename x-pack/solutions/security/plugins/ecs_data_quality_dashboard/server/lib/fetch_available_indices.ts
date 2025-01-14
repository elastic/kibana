/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CatIndicesIndicesRecord } from '@elastic/elasticsearch/lib/api/types';
import dateMath from '@kbn/datemath';

import { getRequestBody } from '../helpers/get_available_indices';

export type FetchAvailableCatIndicesResponseRequired = Array<
  Required<Pick<CatIndicesIndicesRecord, 'index' | 'creation.date'>>
>;

type AggregateName = 'index';
export interface IndexSearchAggregationResponse {
  index: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

const getParsedDateMs = (dateStr: string, roundUp = false) => {
  const date = dateMath.parse(dateStr, roundUp ? { roundUp: true } : undefined);
  if (!date?.isValid()) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date.valueOf();
};

export const fetchAvailableIndices = async (
  esClient: ElasticsearchClient,
  params: { indexNameOrPattern: string; startDate: string; endDate: string }
): Promise<string[]> => {
  const { indexNameOrPattern, startDate, endDate } = params;

  const startDateMs = getParsedDateMs(startDate);
  const endDateMs = getParsedDateMs(endDate, true);

  const indicesCats = (await esClient.cat.indices({
    index: indexNameOrPattern,
    format: 'json',
    h: 'index,creation.date',
  })) as FetchAvailableCatIndicesResponseRequired;

  const indicesCatsInRange = indicesCats.filter((indexInfo) => {
    const creationDateMs = parseInt(indexInfo['creation.date'], 10);
    return creationDateMs >= startDateMs && creationDateMs <= endDateMs;
  });

  const timeSeriesIndicesWithDataInRangeSearchResult = await esClient.search<
    AggregateName,
    IndexSearchAggregationResponse
  >(getRequestBody(params));

  const timeSeriesIndicesWithDataInRange =
    timeSeriesIndicesWithDataInRangeSearchResult.aggregations?.index.buckets.map(
      (bucket) => bucket.key
    ) || [];

  // Combine indices from both sources removing duplicates
  const resultingIndices = new Set<string>();

  for (const indicesCat of indicesCatsInRange) {
    resultingIndices.add(indicesCat.index);
  }

  for (const timeSeriesIndex of timeSeriesIndicesWithDataInRange) {
    resultingIndices.add(timeSeriesIndex);
  }

  return Array.from(resultingIndices);
};
