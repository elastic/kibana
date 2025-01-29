/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlSearchRequest } from '@elastic/elasticsearch/lib/api/types';

export const logEqlRequest = (request: EqlSearchRequest): string => {
  const {
    index,
    allow_no_indices: allowNoIndices,
    expand_wildcards: expandWildcards,
    ignore_unavailable: ignoreUnavailable,
    ...requestBody
  } = request;

  const urlParams = Object.entries({
    allow_no_indices: allowNoIndices,
    expand_wildcards: expandWildcards,
    ignore_unavailable: ignoreUnavailable,
  })
    .reduce<string[]>((acc, [key, value]) => {
      if (value != null) {
        acc.push(`${key}=${value}`);
      }

      return acc;
    }, [])
    .join('&');

  const url = `/${request.index}/_eql/search${urlParams ? `?${urlParams}` : ''}`;

  return `POST ${url}\n${JSON.stringify(requestBody, null, 2)}`;
};
