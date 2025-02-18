/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EventCountOptions, EventsOptions, EventDoc } from './types';
import { getQueryFilter } from '../../utils/get_query_filter';
import { singleSearchAfter } from '../../utils/single_search_after';
import { buildEventsSearchQuery } from '../../utils/build_events_query';

export const MAX_PER_PAGE = 9000;

export const getEventList = async ({
  services,
  ruleExecutionLogger,
  query,
  language,
  index,
  perPage,
  searchAfter,
  filters,
  tuple,
  primaryTimestamp,
  secondaryTimestamp,
  runtimeMappings,
  exceptionFilter,
  eventListConfig,
  indexFields,
  sortOrder = 'desc',
}: EventsOptions): Promise<estypes.SearchResponse<EventDoc>> => {
  const calculatedPerPage = perPage ?? MAX_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }

  ruleExecutionLogger.debug(
    `Querying the events items from the index: "${index}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
  );

  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters,
    index,
    exceptionFilter,
    fields: indexFields,
  });

  const { searchResult } = await singleSearchAfter({
    searchAfterSortIds: searchAfter,
    index,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    services,
    ruleExecutionLogger,
    pageSize: calculatedPerPage,
    filter: queryFilter,
    primaryTimestamp,
    secondaryTimestamp,
    sortOrder,
    trackTotalHits: false,
    runtimeMappings,
    overrideBody: eventListConfig,
  });

  ruleExecutionLogger.debug(`Retrieved events items of size: ${searchResult.hits.hits.length}`);
  return searchResult;
};

export const getEventCount = async ({
  esClient,
  query,
  language,
  filters,
  index,
  tuple,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  indexFields,
}: EventCountOptions): Promise<number> => {
  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters,
    index,
    exceptionFilter,
    fields: indexFields,
  });
  const eventSearchQueryBodyQuery = buildEventsSearchQuery({
    index,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    filter: queryFilter,
    size: 0,
    primaryTimestamp,
    secondaryTimestamp,
    searchAfterSortIds: undefined,
    runtimeMappings: undefined,
  }).body?.query;
  const response = await esClient.count({
    body: { query: eventSearchQueryBodyQuery },
    ignore_unavailable: true,
    index,
  });
  return response.count;
};
