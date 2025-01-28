/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';

export const logSearchRequest = (searchRequest: estypes.SearchRequest): string => {
  const {
    aggregations,
    aggs,
    query,
    _source,
    sort,
    search_after: searchAfter,
    index,
    version,
    runtime_mappings: runtimeMappings,
    fields,
    size,
    ...params
  } = searchRequest;
  const urlParams = Object.entries(params)
    .reduce<string[]>((acc, [key, value]) => {
      if (value != null) {
        acc.push(`${key}=${value}`);
      }

      return acc;
    }, [])
    .join('&');

  const url = `/${index}/_search${urlParams ? `?${urlParams}` : ''}`;

  if (query || aggregations) {
    const body = {
      size,
      query,
      fields,
      aggs,
      aggregations,
      _source,
      runtime_mappings: runtimeMappings,
      sort,
      search_after: searchAfter,
      version,
    };
    return `POST ${url}\n${JSON.stringify({ ...body }, null, 2)}`;
  }

  return `GET ${url}`;
};
