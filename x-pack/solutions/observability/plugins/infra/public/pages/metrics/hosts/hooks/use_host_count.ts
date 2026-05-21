/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useMemo, useEffect } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { GetInfraEntityCountResponsePayloadRT } from '../../../../../common/http_api';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useUnifiedSearchContext } from './use_unified_search';

export const useHostCount = () => {
  const { buildQuery, isReady, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const { data: timeRangeMetadata, status: timeRangeMetadataStatus } =
    useTimeRangeMetadataContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const payload = useMemo(
    () =>
      JSON.stringify({
        query: buildQuery(),
        from: parsedDateRange.from,
        to: parsedDateRange.to,
        schema: searchCriteria?.preferredSchema || DEFAULT_SCHEMA,
      }),
    [buildQuery, parsedDateRange.from, parsedDateRange.to, searchCriteria?.preferredSchema]
  );

  const schemas: DataSchemaFormat[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata?.schemas]
  );

  const { data, status, error } = useFetcher(
    // P5.5 — return `undefined` (not a Promise) until prerequisites settle
    // so `useFetcher` skips the initial double-fire. See the `isReady`
    // comment in `use_unified_search.ts`.
    (callApi) => {
      if (!isReady) return;
      return (async () => {
        const response = await callApi('/api/infra/host/count', {
          method: 'POST',
          body: payload,
        });

        return decodeOrThrow(GetInfraEntityCountResponsePayloadRT)(response);
      })();
    },
    [isReady, payload]
  );

  useEffect(() => {
    if (data && !error) {
      telemetry.reportHostsViewTotalHostCountRetrieved({
        total: data.count ?? 0,
        with_query: !!searchCriteria.query.query,
        with_filters: searchCriteria.filters.length > 0 || searchCriteria.panelFilters.length > 0,
        schema_selected: schemas.length
          ? searchCriteria?.preferredSchema || DEFAULT_SCHEMA
          : 'no schema available',
        schemas_available: schemas.length ? schemas : ['no schema available'],
        schema_error: timeRangeMetadataStatus === FETCH_STATUS.FAILURE,
      });
    }
  }, [data, error, payload, searchCriteria, telemetry, timeRangeMetadataStatus, schemas]);

  return {
    errors: error,
    loading: isPending(status),
    count: data?.count ?? 0,
  };
};

export const HostCount = createContainer(useHostCount);
export const [HostCountProvider, useHostCountContext] = HostCount;
