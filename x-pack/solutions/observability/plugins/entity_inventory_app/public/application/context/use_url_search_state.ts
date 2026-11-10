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
import { isFilter } from '@kbn/es-query';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { decode, encode } from '@kbn/rison';
import { url } from '@kbn/kibana-utils-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import {
  DEFAULT_QUERY,
  DEFAULT_TIME_RANGE,
  ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS,
  URL_SEARCH_STATE_KEY,
} from '../constants';
import { EMPTY_SELECTION } from '../filters/utils/selection';
import type { FilterControlsSelection } from '../filters/utils/selection';
import { clampTimeRange } from '../utils/clamp_time_range';
import { validateQuery } from '../utils/validate_query';

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

const reuseDefaultIfEqual = <T>(value: T, fallback: T): T =>
  isEqual(value, fallback) ? fallback : value;

const sanitize = (
  decoded: rt.TypeOf<typeof UrlSearchStateRT>,
  uiSettings: IUiSettingsClient
): UrlSearchState => {
  const clamped = decoded.dateRange
    ? clampTimeRange(decoded.dateRange, ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS)
    : undefined;
  const dateRange = clamped?.isValid ? clamped.range : DEFAULT_TIME_RANGE;
  const query =
    decoded.query && !validateQuery(decoded.query, uiSettings) ? decoded.query : DEFAULT_QUERY;

  return {
    dateRange: reuseDefaultIfEqual(dateRange, DEFAULT_URL_SEARCH_STATE.dateRange),
    query: reuseDefaultIfEqual(query, DEFAULT_URL_SEARCH_STATE.query),
    filters: reuseDefaultIfEqual(
      (decoded.filters ?? []).filter(isFilter),
      DEFAULT_URL_SEARCH_STATE.filters
    ),
    filterControls: reuseDefaultIfEqual(
      decoded.filterControls ?? EMPTY_SELECTION,
      DEFAULT_URL_SEARCH_STATE.filterControls
    ),
  };
};

const getStateParam = (search: string) => {
  const param = qs.parse(search)[URL_SEARCH_STATE_KEY];
  return Array.isArray(param) ? param[0] : param;
};

const readUrlSearchState = (value: string | null | undefined, uiSettings: IUiSettingsClient) => {
  if (!value) {
    return undefined;
  }
  try {
    const decoded = UrlSearchStateRT.decode(decode(value));
    return isRight(decoded) ? sanitize(decoded.right, uiSettings) : undefined;
  } catch {
    return undefined;
  }
};

export const useUrlSearchState = (): [UrlSearchState, (patch: Partial<UrlSearchState>) => void] => {
  const history = useHistory();
  const { search } = useLocation();
  const {
    services: { uiSettings },
  } = useKibana();

  const stateParam = getStateParam(search);
  const urlState = useMemo(
    () => readUrlSearchState(stateParam, uiSettings),
    [stateParam, uiSettings]
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
    () => readUrlSearchState(getStateParam(history.location.search), uiSettings),
    [history, uiSettings]
  );

  const update = useCallback(
    (patch: Partial<UrlSearchState>) =>
      write({ ...(readCurrent() ?? DEFAULT_URL_SEARCH_STATE), ...patch }),
    [readCurrent, write]
  );

  const writeDefaultsWhenMissing = useCallback(() => {
    if (!urlState) {
      write(DEFAULT_URL_SEARCH_STATE);
    }
  }, [urlState, write]);

  useEffect(writeDefaultsWhenMissing, [writeDefaultsWhenMissing]);

  return [urlState ?? DEFAULT_URL_SEARCH_STATE, update];
};
