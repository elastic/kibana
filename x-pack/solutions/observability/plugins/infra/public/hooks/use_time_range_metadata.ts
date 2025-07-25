/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '@kbn/io-ts-utils';
import createContainer from 'constate';
import type { FetcherResult } from '@kbn/observability-shared-plugin/public';
import type { EntityTypes } from '../../common/http_api/shared/entity_type';
import type { GetTimeRangeMetadataResponse } from '../../common/metrics_sources/get_has_data';
import { getTimeRangeMetadataResponseRT } from '../../common/metrics_sources/get_has_data';
import { useFetcher } from './use_fetcher';

const useTimeRangeMetadata = ({
  dataSource,
  kuery,
  start,
  end,
}: {
  kuery?: string;
  dataSource: EntityTypes;
  start: string;
  end: string;
}): FetcherResult<GetTimeRangeMetadataResponse> => {
  const fetcherResult = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/metrics/source/time_range_metadata', {
        method: 'GET',
        query: {
          from: start,
          to: end,
          kuery,
          dataSource,
        },
      });

      return decodeOrThrow(getTimeRangeMetadataResponseRT)(response);
    },
    [start, end, kuery, dataSource]
  );

  return fetcherResult;
};

export const [TimeRangeMetadataProvider, useTimeRangeMetadataContext] =
  createContainer(useTimeRangeMetadata);
