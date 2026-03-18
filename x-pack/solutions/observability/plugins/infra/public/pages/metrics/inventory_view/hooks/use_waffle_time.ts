/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useEffect } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { constant, identity } from 'fp-ts/function';
import createContainer from 'constate';
import { parse, stringify } from 'query-string';
import { decode as decodeRison } from '@kbn/rison';
import { useHistory } from 'react-router-dom';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryView } from '../../../../../common/inventory_views';
import {
  useKibanaTimefilterTime,
  useSyncKibanaTimeFilterTime,
} from '../../../../hooks/use_kibana_timefilter_time';
import { useInventoryViewsContext } from './use_inventory_views';

const DEFAULT_FROM = 'now-15m';
const DEFAULT_TO = 'now';

const INITIAL_DATE_RANGE: TimeRange = { from: DEFAULT_FROM, to: DEFAULT_TO };

export const DEFAULT_WAFFLE_TIME_STATE: WaffleTimeState = {
  from: DEFAULT_FROM,
  to: DEFAULT_TO,
};

function mapInventoryViewToState(savedView: InventoryView): WaffleTimeState {
  const { time, dateRange } = savedView.attributes;

  if (dateRange) {
    return { from: dateRange.from, to: dateRange.to };
  }

  if (time != null) {
    return {
      from: new Date(time - 15 * 60 * 1000).toISOString(),
      to: new Date(time).toISOString(),
    };
  }

  return DEFAULT_WAFFLE_TIME_STATE;
}

function parseLegacyWaffleTime(raw: string | undefined): WaffleTimeState | undefined {
  if (!raw) return undefined;
  try {
    const decoded = decodeRison(raw);
    const asNew = pipe(WaffleTimeStateRT.decode(decoded), fold(constant(undefined), identity));
    if (asNew) return asNew;

    const asLegacy = pipe(
      legacyWaffleTimeStateRT.decode(decoded),
      fold(constant(undefined), identity)
    );
    if (asLegacy) {
      return {
        from: new Date(asLegacy.currentTime - 15 * 60 * 1000).toISOString(),
        to: new Date(asLegacy.currentTime).toISOString(),
      };
    }
  } catch {
    // ignore rison parse errors
  }
  return undefined;
}

export const useWaffleTime = () => {
  const { currentView } = useInventoryViewsContext();
  const [getTime] = useKibanaTimefilterTime(INITIAL_DATE_RANGE);
  const history = useHistory();

  // Resolve initial default: saved view > legacy waffleTime URL > timefilter > defaults
  const resolvedDefault = (() => {
    if (history?.location) {
      const urlParams = parse(history.location.search, { sort: false });
      const legacy = parseLegacyWaffleTime(urlParams.waffleTime as string | undefined);
      if (legacy) return legacy;
    }
    if (currentView) return mapInventoryViewToState(currentView);
    return getTime();
  })();

  const [urlState, setUrlState] = useUrlState<AppState>({
    defaultState: { dateRange: resolvedDefault },
    decodeUrlState: decodeAppState,
    encodeUrlState: encodeAppState,
    urlStateKey: '_a',
    writeDefaultState: true,
  });

  const dateRange: TimeRange = urlState.dateRange;

  const setDateRange = useCallback(
    (range: TimeRange) => {
      setUrlState({ dateRange: { from: range.from, to: range.to } });
    },
    [setUrlState]
  );

  // Bidirectional sync between _a.dateRange and the Kibana timefilter (same as Hosts)
  useSyncKibanaTimeFilterTime(INITIAL_DATE_RANGE, dateRange, (timeRange) => {
    setUrlState({ dateRange: { from: timeRange.from, to: timeRange.to } });
  });

  // Strip legacy waffleTime from URL on mount
  useEffect(() => {
    if (history?.location) {
      const params = parse(history.location.search, { sort: false });
      if (params.waffleTime) {
        delete params.waffleTime;
        history.replace({ ...history.location, search: stringify(params, { sort: false }) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saved view change
  const previousViewId = useRef<string | undefined>(currentView?.id);
  useEffect(() => {
    if (currentView && currentView.id !== previousViewId.current) {
      const viewState = mapInventoryViewToState(currentView);
      setUrlState({ dateRange: viewState });
      previousViewId.current = currentView.id;
    }
  }, [currentView, setUrlState]);

  return {
    dateRange,
    setDateRange,
    setWaffleTimeState: setDateRange,
  };
};

// -- io-ts types --

export const WaffleTimeStateRT = rt.type({
  from: rt.string,
  to: rt.string,
});

const legacyWaffleTimeStateRT = rt.type({
  currentTime: rt.number,
  isAutoReloading: rt.boolean,
});

export type WaffleTimeState = rt.TypeOf<typeof WaffleTimeStateRT>;

const AppStateRT = rt.type({
  dateRange: WaffleTimeStateRT,
});

type AppState = rt.TypeOf<typeof AppStateRT>;

const encodeAppState = AppStateRT.encode;
const decodeAppState = (value: unknown): AppState | undefined =>
  pipe(AppStateRT.decode(value), fold(constant(undefined), identity));

export const WaffleTime = createContainer(useWaffleTime);
export const [WaffleTimeProvider, useWaffleTimeContext] = WaffleTime;
