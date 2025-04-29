/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EventCountOptions, EventsOptions, EventDoc } from './types';
import { getQueryFilter } from '../../utils/get_query_filter';
import { singleSearchAfter } from '../../utils/single_search_after';
import { buildEventsSearchQuery } from '../../utils/build_events_query';

export const MAX_PER_PAGE = 9000;

export const getEventList = async ({
  sharedParams,
  services,
  perPage,
  searchAfter,
  filters,
  eventListConfig,
  indexFields,
  sortOrder = 'desc',
}: EventsOptions): Promise<estypes.SearchResponse<EventDoc, unknown>> => {
  const {
    inputIndex,
    ruleExecutionLogger,
    primaryTimestamp,
    secondaryTimestamp,
    runtimeMappings,
    tuple,
    exceptionFilter,
    completeRule: {
      ruleParams: { query, language },
    },
  } = sharedParams;
  const calculatedPerPage = perPage ?? MAX_PER_PAGE;
  if (calculatedPerPage > 10000) {
    throw new TypeError('perPage cannot exceed the size of 10000');
  }

  ruleExecutionLogger.debug(
    `Querying the events items from the index: "${sharedParams.inputIndex}" with searchAfter: "${searchAfter}" for up to ${calculatedPerPage} indicator items`
  );

  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters,
    index: inputIndex,
    exceptionFilter,
    fields: indexFields,
  });

  const searchRequest = buildEventsSearchQuery({
    aggregations: undefined,
    searchAfterSortIds: searchAfter,
    index: inputIndex,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    size: calculatedPerPage,
    filter: queryFilter,
    primaryTimestamp,
    secondaryTimestamp,
    sortOrder,
    trackTotalHits: false,
    runtimeMappings,
    overrideBody: eventListConfig,
  });

  const { searchResult } = await singleSearchAfter({
    searchRequest,
    services,
    ruleExecutionLogger,
  });

  ruleExecutionLogger.debug(`Retrieved events items of size: ${searchResult.hits.hits.length}`);
  return searchResult;
};

// TODO: possible bug: event count does not respect large value list exceptions, but searchAfterBulkCreate does.
// could lead to worse performance

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
    aggregations: undefined,
    index,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    filter: queryFilter,
    size: 0,
    primaryTimestamp,
    secondaryTimestamp,
    searchAfterSortIds: undefined,
    runtimeMappings: undefined,
  }).query;
  const response = await esClient.count({
    query: eventSearchQueryBodyQuery,
    ignore_unavailable: true,
    index,
  });
  return response.count;
};
