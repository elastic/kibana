/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { isRunningResponse, type ISearchStart } from '@kbn/data-plugin/public';

export interface AlertsQueryParams {
  alertIds: string[];
  from: number;
  size: number;
  sort?: Array<Record<string, 'asc' | 'desc'>>;
}

interface FindAlertsParams extends AlertsQueryParams {
  signal?: AbortSignal;
}

export const createFindAlerts =
  (searchService: ISearchStart) =>
  async ({
    signal,
    alertIds,
    from,
    size,
    sort,
  }: FindAlertsParams): Promise<SearchResponse<Record<string, unknown>>> => {
    return new Promise((resolve, reject) => {
      const $subscription = searchService
        .search(
          {
            params: {
              body: {
                query: {
                  ids: { values: alertIds },
                },
                from,
                size,
                sort,
                fields: ['*'],
                _source: false,
              },
            },
          },
          { abortSignal: signal }
        )
        .subscribe({
          next: (response) => {
            if (!isRunningResponse(response)) {
              $subscription.unsubscribe();
              resolve(response.rawResponse);
            }
          },
          error: (err) => {
            $subscription.unsubscribe();
            reject(new Error(`Error while loading alerts`));
          },
        });
    });
  };
