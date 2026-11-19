/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { DEFAULT_OVERVIEW_PERCENTILE, OVERVIEW_PERCENTILES } from '../../common/overview_filters';
import type {
  OverviewPercentile,
  OverviewPercentileParam,
  OverviewSearchParams,
} from '../../common/overview_filters';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useOverviewFilters } from './use_overview_filters';
import { useUpdateUrlQuery } from './use_update_url_query';

/**
 * The percentile of the load time from the `percentile` URL param; 75 when unset. The default is
 * kept out of the URL.
 */
export const useOverviewPercentile = (): {
  percentile: OverviewPercentile;
  /** The param the route takes, `undefined` for the default. */
  percentileParam: OverviewPercentileParam | undefined;
  setPercentile: (percentile: OverviewPercentile) => void;
} => {
  const { query } = useDigitalExperienceParams('/');
  const updateUrlQuery = useUpdateUrlQuery();

  const percentile =
    OVERVIEW_PERCENTILES.find((candidate) => String(candidate) === query.percentile) ??
    DEFAULT_OVERVIEW_PERCENTILE;

  const setPercentile = useCallback(
    (next: OverviewPercentile) =>
      updateUrlQuery({
        percentile: next === DEFAULT_OVERVIEW_PERCENTILE ? undefined : String(next),
      }),
    [updateUrlQuery]
  );

  return {
    percentile,
    percentileParam: percentile === DEFAULT_OVERVIEW_PERCENTILE ? undefined : `${percentile}`,
    setPercentile,
  };
};

/** The KQL query of the Overview from the `kuery` URL param; `undefined` when unset or empty. */
export const useOverviewKuery = (): {
  kuery: string | undefined;
  /** Sets the query, or removes it for an empty one. */
  setKuery: (kuery: string) => void;
} => {
  const { query } = useDigitalExperienceParams('/');
  const updateUrlQuery = useUpdateUrlQuery();

  const setKuery = useCallback(
    (next: string) => updateUrlQuery({ kuery: next.trim() || undefined }),
    [updateUrlQuery]
  );

  return { kuery: query.kuery || undefined, setKuery };
};

/**
 * What the URL narrows the Overview's data by, as the routes take it: the filters and the KQL
 * query. The same object between renders unless they change, for a request that depends on it.
 */
export const useOverviewSearchParams = (): OverviewSearchParams => {
  const { params } = useOverviewFilters();
  const { kuery } = useOverviewKuery();

  return useMemo(() => (kuery ? { ...params, kuery } : params), [params, kuery]);
};
