/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getQueryFilter } from '../../utils/get_query_filter';
import type {
  GetThreatListOptions,
  ThreatListCountOptions,
  ThreatListDoc,
  GetSortForThreatList,
} from './types';

/**
 * This should not exceed 10000 (10k)
 */
export const INDICATOR_PER_PAGE = 1000;

export const getThreatList = async ({
  sharedParams,
  esClient,
  perPage,
  searchAfter,
  threatFilters,
  threatListConfig,
  pitId,
  indexFields,
}: GetThreatListOptions): Promise<estypes.SearchResponse<ThreatListDoc>> => {
  const {
    exceptionFilter,
    listClient,
    runtimeMappings,
    ruleExecutionLogger,
    completeRule: {
      ruleParams: { threatQuery, threatLanguage, threatIndex },
    },
  } = sharedParams;
  const calculatedPerPage = perPage ?? INDICATOR_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }
  const queryFilter = getQueryFilter({
    query: threatQuery,
    language: threatLanguage ?? 'kuery',
    filters: threatFilters,
    index: threatIndex,
    // Exceptions shouldn't apply to threat list??
    exceptionFilter,
    fields: indexFields,
  });

  ruleExecutionLogger.debug(
    `Querying the indicator items from the index: "${threatIndex}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
  );

  const response = await esClient.search<
    ThreatListDoc,
    Record<string, estypes.AggregationsAggregate>
  >({
    ...threatListConfig,
    query: queryFilter,
    search_after: searchAfter,
    runtime_mappings: runtimeMappings,
    sort: getSortForThreatList({
      index: threatIndex,
      listItemIndex: listClient.getListItemName(),
    }),
    track_total_hits: false,
    size: calculatedPerPage,
    pit: { id: pitId },
  });

  ruleExecutionLogger.debug(`Retrieved indicator items of size: ${response.hits.hits.length}`);

  return response;
};

export const getSortForThreatList = ({
  index,
  listItemIndex,
}: GetSortForThreatList): estypes.Sort => {
  const defaultSort = ['_shard_doc'];
  if (index.length === 1 && index[0] === listItemIndex) {
    return defaultSort;
  }

  return [...defaultSort, { '@timestamp': 'asc' }];
};

export const getThreatListCount = async ({
  esClient,
  query,
  language,
  threatFilters,
  index,
  exceptionFilter,
  indexFields,
}: ThreatListCountOptions): Promise<number> => {
  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters: threatFilters,
    index,
    exceptionFilter,
    fields: indexFields,
  });
  const response = await esClient.count({
    query: queryFilter,
    ignore_unavailable: true,
    index,
  });
  return response.count;
};
