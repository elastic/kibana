/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

export const runEsqlQuery = async (
  searchService: DataPublicPluginStart['search'],
  query: string,
  signal?: AbortSignal
): Promise<ESQLSearchResponse> => {
  const { rawResponse } = await lastValueFrom(
    searchService.search<
      IKibanaSearchRequest<{ query: string }>,
      IKibanaSearchResponse<ESQLSearchResponse>
    >(
      { params: { query } },
      {
        abortSignal: signal,
        strategy: ESQL_ASYNC_SEARCH_STRATEGY,
        projectRouting: PROJECT_ROUTING.ORIGIN,
      }
    )
  );

  return rawResponse;
};
