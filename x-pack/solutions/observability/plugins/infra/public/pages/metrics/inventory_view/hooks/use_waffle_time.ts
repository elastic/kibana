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
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryView } from '../../../../../common/inventory_views';
import { useSyncKibanaTimeFilterTime } from '../../../../hooks/use_kibana_timefilter_time';
import { useInventoryViewsContext } from './use_inventory_views';

const DEFAULT_FROM = 'now-15m';
const DEFAULT_TO = 'now';

export const DEFAULT_WAFFLE_TIME_STATE: WaffleTimeState = {
  from: DEFAULT_FROM,
  to: DEFAULT_TO,
};

const DEFAULT_DATE_RANGE: TimeRange = { from: DEFAULT_FROM, to: DEFAULT_TO };

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

export const useWaffleTime = () => {
  const { currentView } = useInventoryViewsContext();
  const [urlState, setUrlState] = useUrlState<WaffleTimeState>({
    defaultState: currentView ? mapInventoryViewToState(currentView) : DEFAULT_WAFFLE_TIME_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleTime',
    writeDefaultState: true,
  });

  const dateRange: TimeRange = { from: urlState.from, to: urlState.to };

  const setDateRange = useCallback(
    (range: TimeRange) => {
      setUrlState({ from: range.from, to: range.to });
    },
    [setUrlState]
  );

  useSyncKibanaTimeFilterTime(DEFAULT_DATE_RANGE, dateRange, setDateRange);

  const previousViewId = useRef<string | undefined>(currentView?.id);
  useEffect(() => {
    if (currentView && currentView.id !== previousViewId.current) {
      setUrlState(mapInventoryViewToState(currentView));
      previousViewId.current = currentView.id;
    }
  }, [currentView, setUrlState]);

  return {
    dateRange,
    setDateRange,
    setWaffleTimeState: setUrlState,
  };
};

export const WaffleTimeStateRT = rt.type({
  from: rt.string,
  to: rt.string,
});

const legacyWaffleTimeStateRT = rt.type({
  currentTime: rt.number,
  isAutoReloading: rt.boolean,
});

export type WaffleTimeState = rt.TypeOf<typeof WaffleTimeStateRT>;
const encodeUrlState = WaffleTimeStateRT.encode;
const decodeUrlState = (value: unknown): WaffleTimeState | undefined => {
  const decoded = pipe(WaffleTimeStateRT.decode(value), fold(constant(undefined), identity));
  if (decoded) {
    return decoded;
  }
  const legacy = pipe(legacyWaffleTimeStateRT.decode(value), fold(constant(undefined), identity));
  if (legacy) {
    return {
      from: new Date(legacy.currentTime - 15 * 60 * 1000).toISOString(),
      to: new Date(legacy.currentTime).toISOString(),
    };
  }
  return undefined;
};

export const WaffleTime = createContainer(useWaffleTime);
export const [WaffleTimeProvider, useWaffleTimeContext] = WaffleTime;
