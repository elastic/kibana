/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { singleIncludedValue } from '../../common/filter_values';
import { SESSIONS_LIST_MAX_FACET_LENGTHS } from '../../common/sessions';
import { SHARED_FILTER_NAMES } from '../utils/overview_filters_query';
import type { SharedFilterName } from '../utils/overview_filters_query';
import { filterValueRt } from '../utils/sessions_list_query';
import type { SessionsListUrlQuery } from '../utils/sessions_list_query';
import { useOverviewFilters } from './use_overview_filters';

type SharedFilters = Pick<SessionsListUrlQuery, SharedFilterName>;

/** What the Sessions list accepts of each shared filter. */
export const SESSIONS_FILTER_RTS = {
  browser: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.browser),
  os: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.os),
  country: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.country),
};

/**
 * The filters of the Overview that the Sessions list has too (`browser`, `os` and `country`), for
 * links between the two tabs. The Sessions list takes one value, so a filter carries over only
 * when it is exactly one included value, and not when it has several values or an exclusion.
 */
export const useSharedFilters = (): SharedFilters => {
  const { filters } = useOverviewFilters();

  return useMemo(() => {
    const shared: SharedFilters = {};
    for (const name of SHARED_FILTER_NAMES) {
      const value = singleIncludedValue(filters[name]);
      if (value !== undefined && SESSIONS_FILTER_RTS[name].is(value)) {
        shared[name] = value;
      }
    }
    return shared;
  }, [filters]);
};
