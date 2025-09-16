/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import DateMath from '@kbn/datemath';
import { constant, identity } from 'fp-ts/function';
import createContainer from 'constate';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type { Moment } from 'moment';
import type { InventoryView } from '../../../../../common/inventory_views';
import { useKibanaTimefilterTime } from '../../../../hooks/use_kibana_timefilter_time';
import { useInventoryViewsContext } from './use_inventory_views';
export const DEFAULT_WAFFLE_TIME_STATE: WaffleTimeState = {
  currentTime: Date.now(),
  isAutoReloading: false,
};

function mapInventoryViewToState(savedView: InventoryView, defaultTime?: Moment): WaffleTimeState {
  const { time, autoReload } = savedView.attributes;

  return {
    currentTime: time ?? defaultTime?.toDate().getTime() ?? Date.now(),
    isAutoReloading: autoReload,
  };
}

export const useWaffleTime = () => {
  // INFO: We currently only use the "to" time, but in the future we may do more.
  const { currentView } = useInventoryViewsContext();
  const [getTime] = useKibanaTimefilterTime({ from: 'now', to: 'now' });
  const kibanaTime = DateMath.parse(getTime().to);
  const [urlState, setUrlState] = useUrlState<WaffleTimeState>({
    defaultState: currentView
      ? mapInventoryViewToState(currentView, kibanaTime)
      : {
          ...DEFAULT_WAFFLE_TIME_STATE,
          currentTime: kibanaTime ? kibanaTime.toDate().getTime() : Date.now(),
        },
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleTime',
    writeDefaultState: true,
  });

  const previousViewId = useRef<string | undefined>(currentView?.id);
  useEffect(() => {
    if (currentView && currentView.id !== previousViewId.current) {
      setUrlState(mapInventoryViewToState(currentView));
      previousViewId.current = currentView.id;
    }
  }, [currentView, setUrlState]);

  const startAutoReload = useCallback(() => {
    setUrlState((previous) => ({ ...previous, isAutoReloading: true, currentTime: Date.now() }));
  }, [setUrlState]);

  const stopAutoReload = useCallback(() => {
    setUrlState((previous) => ({ ...previous, isAutoReloading: false }));
  }, [setUrlState]);

  const jumpToTime = useCallback(
    (time: number) => {
      setUrlState((previous) => ({ ...previous, currentTime: time }));
    },
    [setUrlState]
  );

  const currentTimeRange = useMemo(
    () => ({
      from: urlState.currentTime - 1000 * 60 * 5,
      interval: '1m',
      to: urlState.currentTime,
    }),
    [urlState.currentTime]
  );

  return {
    ...urlState,
    currentTimeRange,
    startAutoReload,
    stopAutoReload,
    jumpToTime,
    setWaffleTimeState: setUrlState,
  };
};

export const WaffleTimeStateRT = rt.type({
  currentTime: rt.number,
  isAutoReloading: rt.boolean,
});

export type WaffleTimeState = rt.TypeOf<typeof WaffleTimeStateRT>;
const encodeUrlState = WaffleTimeStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(WaffleTimeStateRT.decode(value), fold(constant(undefined), identity));

export const WaffleTime = createContainer(useWaffleTime);
export const [WaffleTimeProvider, useWaffleTimeContext] = WaffleTime;
