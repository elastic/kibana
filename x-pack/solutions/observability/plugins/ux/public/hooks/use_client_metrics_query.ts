/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useMemo } from 'react';
import { useDataView } from '../components/app/rum_dashboard/local_uifilters/use_data_view';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { callDateMath } from '../services/data/call_date_math';
import { clientMetricsQuery } from '../services/data/client_metrics_query';

export function useClientMetricsQuery() {
  const {
    rangeId,
    urlParams: { start, end, percentile = 50, searchTerm },
    uxUiFilters,
  } = useLegacyUrlParams();
  const { dataViewTitle } = useDataView();
  const { data: esQueryResponse, loading } = useEsSearch(
    {
      index: dataViewTitle,
      ...clientMetricsQuery(
        callDateMath(start),
        callDateMath(end),
        percentile,
        searchTerm,
        uxUiFilters
      ),
    },
    [start, end, percentile, searchTerm, uxUiFilters, dataViewTitle, rangeId],
    { name: 'UxClientMetrics' }
  );

  const data = useMemo(() => {
    if (!esQueryResponse?.aggregations) return {};

    const {
      hasFetchStartField: { backEnd, totalPageLoadDuration },
    } = esQueryResponse.aggregations;

    const pkey = percentile.toFixed(1);

    const totalPageLoadDurationValue = totalPageLoadDuration.values[pkey] ?? 0;
    const totalPageLoadDurationValueMs = totalPageLoadDurationValue / 1000; // Microseconds to milliseconds
    const backendValue = backEnd.values[pkey] ?? 0;

    return {
      pageViews: { value: esQueryResponse.hits.total.value ?? 0 },
      totalPageLoadDuration: { value: totalPageLoadDurationValueMs },
      backEnd: { value: backendValue },
      frontEnd: { value: totalPageLoadDurationValueMs - backendValue },
    };
  }, [esQueryResponse, percentile]);

  return { data, loading };
}
