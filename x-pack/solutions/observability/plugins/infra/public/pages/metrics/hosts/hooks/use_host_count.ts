/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useEffect, useMemo } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { GetInfraEntityCountResponsePayloadRT } from '../../../../../common/http_api';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsPageReady } from './use_hosts_page_ready';

export const useHostCount = () => {
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();
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
    // Returning `undefined` until ready skips useFetcher's initial double-fire.
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

  const loading = isPending(status);

  return {
    errors: error,
    loading,
    count: data?.count ?? 0,
  };
};

export const HostCount = createContainer(useHostCount);
export const [HostCountProvider, useHostCountContext] = HostCount;
