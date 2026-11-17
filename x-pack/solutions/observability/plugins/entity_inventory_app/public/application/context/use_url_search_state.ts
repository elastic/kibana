/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { isEqual } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';
import * as rt from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { buildEsQuery, isFilter } from '@kbn/es-query';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { decode, encode } from '@kbn/rison';
import { url } from '@kbn/kibana-utils-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { DEFAULT_QUERY, DEFAULT_TIME_RANGE, URL_SEARCH_STATE_KEY } from '../constants';
import { EMPTY_SELECTION } from '../filters/utils/selection';
import type { FilterControlsSelection } from '../filters/utils/selection';
import { checkTimeRange, getMaxTimeRange } from '../utils/check_time_range';
import { validateQuery } from '../utils/validate_query';
import { TIME_RANGE_CLAMPED_TOAST_TITLE } from '../translations';

export interface UrlSearchState {
  dateRange: TimeRange;
  query: Query;
  filters: Filter[];
  filterControls: FilterControlsSelection;
}

const DEFAULT_URL_SEARCH_STATE: UrlSearchState = {
  dateRange: DEFAULT_TIME_RANGE,
  query: DEFAULT_QUERY,
  filters: [],
  filterControls: EMPTY_SELECTION,
};

const UrlSearchStateRT = rt.partial({
  dateRange: rt.type({ from: rt.string, to: rt.string }),
  query: rt.type({
    language: rt.union([rt.literal('kuery'), rt.literal('lucene')]),
    query: rt.string,
  }),
  filters: rt.array(rt.UnknownRecord),
  filterControls: rt.intersection([
    rt.type({ attributes: rt.record(rt.string, rt.array(rt.string)) }),
    rt.partial({ category: rt.string, type: rt.string }),
  ]),
});

// The filter bar draws `alias`, `negate` and `disabled` from the metadata of a filter, so a filter
// whose metadata has other types is dropped instead of crashing the page.
const FilterRT = rt.type({
  meta: rt.partial({
    alias: rt.union([rt.null, rt.string]),
    negate: rt.boolean,
    disabled: rt.boolean,
  }),
});

const reuseDefaultIfEqual = <T>(value: T, fallback: T): T =>
  isEqual(value, fallback) ? fallback : value;

const canBuildEsQuery = (filter: Filter): boolean => {
  try {
    buildEsQuery(undefined, [], [filter]);
    return true;
  } catch {
    return false;
  }
};

interface UrlReadResult {
  state: UrlSearchState;
  /** The URL holds something the state does not: it is written again with the state. */
  needsRepair: boolean;
  /** The range in the URL is not allowed, so the state holds the widest allowed range. */
  wasLimited: boolean;
}

const URL_STATE_KEYS = ['dateRange', 'query', 'filters', 'filterControls'] as const;

const sanitize = (
  decoded: rt.TypeOf<typeof UrlSearchStateRT>,
  uiSettings: IUiSettingsClient,
  maxDays: number
): UrlReadResult => {
  const rangeCheck = decoded.dateRange ? checkTimeRange(decoded.dateRange, maxDays) : undefined;
  const wasLimited = rangeCheck === 'not_allowed';
  const dateRange =
    decoded.dateRange && rangeCheck === 'valid'
      ? decoded.dateRange
      : wasLimited
      ? getMaxTimeRange(maxDays)
      : DEFAULT_TIME_RANGE;
  const query =
    decoded.query && !validateQuery(decoded.query, uiSettings) ? decoded.query : DEFAULT_QUERY;

  const state: UrlSearchState = {
    dateRange: reuseDefaultIfEqual(dateRange, DEFAULT_URL_SEARCH_STATE.dateRange),
    query: reuseDefaultIfEqual(query, DEFAULT_URL_SEARCH_STATE.query),
    filters: reuseDefaultIfEqual(
      (decoded.filters ?? [])
        .filter(isFilter)
        .filter((filter) => FilterRT.is(filter))
        .filter(canBuildEsQuery),
      DEFAULT_URL_SEARCH_STATE.filters
    ),
    filterControls: reuseDefaultIfEqual(
      decoded.filterControls ?? EMPTY_SELECTION,
      DEFAULT_URL_SEARCH_STATE.filterControls
    ),
  };
  const needsRepair = URL_STATE_KEYS.some(
    (key) => decoded[key] !== undefined && !isEqual(decoded[key], state[key])
  );

  return { state, needsRepair, wasLimited };
};

const getStateParam = (search: string) => {
  const param = qs.parse(search)[URL_SEARCH_STATE_KEY];
  return Array.isArray(param) ? param[0] : param;
};

const readUrlSearchState = (
  value: string | null | undefined,
  uiSettings: IUiSettingsClient,
  maxDays: number
): UrlReadResult | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    const decoded = UrlSearchStateRT.decode(decode(value));
    return isRight(decoded) ? sanitize(decoded.right, uiSettings, maxDays) : undefined;
  } catch {
    return undefined;
  }
};

export const useUrlSearchState = ({
  maxDays,
}: {
  maxDays: number;
}): [UrlSearchState, (patch: Partial<UrlSearchState>) => void] => {
  const history = useHistory();
  const { search } = useLocation();
  const {
    services: { uiSettings, notifications },
  } = useKibana();

  const stateParam = getStateParam(search);
  const urlRead = useMemo(
    () => readUrlSearchState(stateParam, uiSettings, maxDays),
    [stateParam, uiSettings, maxDays]
  );

  const write = useCallback(
    (state: UrlSearchState) => {
      const params = {
        ...qs.parse(history.location.search),
        [URL_SEARCH_STATE_KEY]: encode(state),
      };
      history.replace({
        ...history.location,
        search: qs.stringify(url.encodeQuery(params), { sort: false, encode: false }),
      });
    },
    [history]
  );

  const readCurrent = useCallback(
    () => readUrlSearchState(getStateParam(history.location.search), uiSettings, maxDays),
    [history, uiSettings, maxDays]
  );

  const update = useCallback(
    (patch: Partial<UrlSearchState>) =>
      write({ ...(readCurrent()?.state ?? DEFAULT_URL_SEARCH_STATE), ...patch }),
    [readCurrent, write]
  );

  const repairUrl = useCallback(() => {
    if (!urlRead) {
      write(DEFAULT_URL_SEARCH_STATE);
    } else if (urlRead.needsRepair) {
      write(urlRead.state);
      if (urlRead.wasLimited) {
        notifications.toasts.addWarning({ title: TIME_RANGE_CLAMPED_TOAST_TITLE });
      }
    }
  }, [notifications, urlRead, write]);

  useEffect(repairUrl, [repairUrl]);

  return [urlRead?.state ?? DEFAULT_URL_SEARCH_STATE, update];
};
