/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useEffect, useRef } from 'react';
import {
  formatHasRumResult,
  hasRumDataQuery,
  HAS_RUM_DATA_TIERS,
} from '../../../../services/data/has_rum_data_query';
import { useDataView } from '../local_uifilters/use_data_view';

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
      ...hasRumDataQuery({ dataTiers: HAS_RUM_DATA_TIERS }),
    },
    [dataViewTitle],
    {
      name: 'UXHasRumDataInHotOrWarmTiers',
    }
  );

  const tieredHasData = tiered !== undefined && tiered.hits.total.value > 0;
  const tieredFailed = !loading && tieredError !== undefined;
  const tieredIsEmpty = !loading && tiered !== undefined && tiered.hits.total.value === 0;

  // Latch the decision for as long as we are looking at the same data view. `tieredIsEmpty` drops
  // back to false whenever the tier restricted query is re-issued, and it gates the fallback's
  // `index`, so without the latch a re-issue disables the fallback mid-flight and the stale empty
  // tiered result briefly becomes the answer — which renders the onboarding screen at a user who
  // does have data.
  //
  // Clear when the data view changes or hot/warm later has hits, otherwise navigating away from an
  // empty view and back re-enables the fallback before the cheap pass answers. A failed cheap pass
  // is treated like empty so the unrestricted query still runs.
  const latchedFor = useRef<string | undefined>(undefined);
  if (latchedFor.current !== undefined && (latchedFor.current !== dataViewTitle || tieredHasData)) {
    latchedFor.current = undefined;
  }
  if (tieredIsEmpty || tieredFailed) {
    latchedFor.current = dataViewTitle;
  }
  const needsFallback = tieredIsEmpty || tieredFailed || latchedFor.current === dataViewTitle;

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
      const { hasData } = formatHasRumResult(response, dataViewTitle);
      setCachedHasData(hasData);
    }
  }, [dataViewTitle, response, setCachedHasData]);

  if (!response) return { loading: isLoading, hasData: cachedHasData ?? false };

  return {
    hasData: formatHasRumResult(response, dataViewTitle).hasData,
    loading: isLoading,
    dataViewTitle,
  };
}
