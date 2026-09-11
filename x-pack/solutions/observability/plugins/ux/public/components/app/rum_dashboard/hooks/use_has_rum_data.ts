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
  hasRumDataQuery,
  HAS_RUM_DATA_TIERS,
  HAS_RUM_DATA_LOOKBACK,
} from '../../../../services/data/has_rum_data_query';
import { useDataView } from '../local_uifilters/use_data_view';
import { useFallbackLatch } from './use_fallback_latch';

export function useHasRumData() {
  // No initial value, so `undefined` means no earlier visit answered this. That is different from
  // an earlier visit answering "no", and the two need to be told apart below.
  const [cachedHasData, setCachedHasData] = useLocalStorage<boolean>('uxAppHasDataBoolean');

  const { dataViewTitle } = useDataView();

  const {
    data: tiered,
    loading,
    error: tieredError,
  } = useEsSearch(
    {
      index: dataViewTitle,
      ...hasRumDataQuery({ dataTiers: HAS_RUM_DATA_TIERS, since: HAS_RUM_DATA_LOOKBACK }),
    },
    [dataViewTitle],
    {
      name: 'UXHasRumDataInHotOrWarmTiers',
    }
  );

  const tieredHasData = tiered !== undefined && tiered.hits.total.value > 0;
  const tieredFailed = !loading && tieredError !== undefined;
  const tieredIsEmpty = !loading && tiered !== undefined && tiered.hits.total.value === 0;

  // Without the latch, re-issuing the cheap query disables the fallback mid-flight and the stale
  // empty result briefly becomes the answer — which renders the onboarding screen at a user who does
  // have data, just on a colder tier or older than the lookback. A failed cheap pass latches like an
  // empty one so the unrestricted query still runs.
  const isLatched = useFallbackLatch(dataViewTitle, tieredIsEmpty || tieredFailed, tieredHasData);
  const needsFallback = tieredIsEmpty || tieredFailed || isLatched;

  const { data: fallback, error: fallbackError } = useEsSearch(
    {
      index: needsFallback ? dataViewTitle : undefined,
      ...hasRumDataQuery(),
    },
    [dataViewTitle, needsFallback],
    {
      name: 'UXHasRumDataUnbounded',
    }
  );

  const response = tieredHasData || !needsFallback ? tiered : fallback;

  const fallbackHasResult = fallback !== undefined || fallbackError !== undefined;

  // Show the loading screen only until this deployment has been answered once. A return visit keeps
  // showing the previous answer and revalidates quietly: the check costs two sequential requests
  // when the tier restricted query finds nothing, and spinning for both turns a pause that used to
  // go unnoticed into a visible flash of the loading screen.
  //
  // `needsFallback && !fallbackHasResult` covers the render where the fallback has been enabled but
  // its effect has not started it yet, when `useEsSearch` still reports `loading: false`.
  const isLoading =
    cachedHasData === undefined && (loading || (needsFallback && !fallbackHasResult));

  useEffect(() => {
    if (response) {
      setCachedHasData(response.hits.total.value > 0);
    }
  }, [dataViewTitle, response, setCachedHasData]);

  if (!response) return { loading: isLoading, hasData: cachedHasData ?? false };

  return {
    hasData: response.hits.total.value > 0,
    loading: isLoading,
    dataViewTitle,
  };
}
