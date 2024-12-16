/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchStart } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { search } from '../../../utils/search';
import { Indicator } from '../../../../common/types/indicator';

interface FetchIndicatorsDependencies {
  searchService: ISearchStart;

  /**
   * Optional dependency, can be passed when available in upper scope
   */
  inspectorAdapter?: RequestAdapter;
}

export interface RawIndicatorsResponse {
  hits: {
    hits: any[];
    total: number;
  };
}

export interface FetchParams {
  indicatorId: string;
}

type ReactQueryKey = [string, FetchParams];

export interface IndicatorsQueryParams {
  signal?: AbortSignal;
  queryKey: ReactQueryKey;
}

export const createFetchIndicatorById =
  ({ searchService, inspectorAdapter }: FetchIndicatorsDependencies) =>
  async ({ indicatorId }: FetchParams, signal?: AbortSignal): Promise<Indicator | undefined> => {
    const query = {
      bool: {
        must: [
          {
            ids: {
              values: [indicatorId],
            },
          },
        ],
      },
    };
    const fields = [
      {
        field: '*',
        include_unmapped: true,
      },
    ];

    const {
      hits: {
        hits: [firstResult],
      },
    } = await search<RawIndicatorsResponse>(
      searchService,
      {
        params: {
          body: {
            query,
            fields,
            size: 1,
          },
        },
      },
      {
        inspectorAdapter,
        requestName: `Fetch indicator by Id (${indicatorId})`,
        signal,
        skipDefaultStrategy: true,
      }
    );

    return firstResult;
  };
