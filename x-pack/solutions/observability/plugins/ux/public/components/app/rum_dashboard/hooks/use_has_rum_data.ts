/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useEffect } from 'react';
import {
  formatHasRumResult,
  hasRumDataQuery,
  HAS_RUM_DATA_TIERS,
} from '../../../../services/data/has_rum_data_query';
import { useDataView } from '../local_uifilters/use_data_view';

export function useHasRumData() {
  const [hasData, setHasData] = useLocalStorage('uxAppHasDataBoolean', false);

  const { dataViewTitle } = useDataView();

  const { data: tiered, loading } = useEsSearch(
    {
      index: dataViewTitle,
      ...hasRumDataQuery({ dataTiers: HAS_RUM_DATA_TIERS }),
    },
    [dataViewTitle],
    {
      name: 'UXHasRumDataInHotOrWarmTiers',
    }
  );

  const needsFallback = !loading && tiered !== undefined && tiered.hits.total.value === 0;

  const { data: fallback, error: fallbackError } = useEsSearch(
    {
      index: needsFallback ? dataViewTitle : undefined,
      ...hasRumDataQuery({}),
    },
    [dataViewTitle, needsFallback],
    {
      name: 'UXHasRumDataUnbounded',
    }
  );

  const response = needsFallback ? fallback : tiered;

  // `useEsSearch` reports `loading: false` for the render where the fallback becomes enabled: its
  // effect starts the request only afterwards. Gate on a definitive result instead, or the
  // onboarding screen flashes.
  const fallbackHasResult = fallback !== undefined || fallbackError !== undefined;
  const isLoading = loading || (needsFallback && !fallbackHasResult);

  useEffect(() => {
    if (response) {
      const { hasData: hasDataN } = formatHasRumResult(response, dataViewTitle);
      setHasData(hasDataN);
    }
  }, [dataViewTitle, response, setHasData]);

  if (!response) return { loading: isLoading, hasData };

  return {
    hasData: formatHasRumResult(response, dataViewTitle).hasData,
    loading: isLoading,
    dataViewTitle,
  };
}
