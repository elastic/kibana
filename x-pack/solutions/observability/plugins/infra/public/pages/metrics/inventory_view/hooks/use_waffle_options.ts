/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import createContainer from 'constate';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { InventoryViewOptions } from '../../../../../common/inventory_views/types';
import {
  type InventoryLegendOptions,
  type InventoryOptionsState,
  type InventorySortOption,
  inventoryOptionsStateRT,
} from '../../../../../common/inventory_views';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import type {
  SnapshotMetricInput,
  SnapshotGroupBy,
  SnapshotCustomMetricInput,
} from '../../../../../common/http_api/snapshot_api';

export const DEFAULT_LEGEND: WaffleLegendOptions = {
  palette: 'cool',
  steps: 10,
  reverseColors: false,
};

export const DEFAULT_WAFFLE_OPTIONS_STATE: WaffleOptionsState = {
  metric: { type: 'cpuV2' },
  groupBy: [],
  nodeType: 'host',
  view: 'map',
  customOptions: [],
  boundsOverride: { max: 1, min: 0 },
  autoBounds: true,
  accountId: '',
  region: '',
  customMetrics: [],
  legend: DEFAULT_LEGEND,
  source: 'default',
  sort: { by: 'name', direction: 'desc' },
  timelineOpen: false,
};

export const useWaffleOptions = () => {
  const [urlState, setUrlState] = useUrlState<WaffleOptionsState>({
    defaultState: DEFAULT_WAFFLE_OPTIONS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleOptions',
  });

  const [state, setState] = useState<WaffleOptionsState>(urlState);

  useEffect(() => setUrlState(state), [setUrlState, state]);

  const changeMetric = useCallback(
    (metric: SnapshotMetricInput) => setState((previous) => ({ ...previous, metric })),
    [setState]
  );

  const changeGroupBy = useCallback(
    (groupBy: SnapshotGroupBy) => setState((previous) => ({ ...previous, groupBy })),
    [setState]
  );

  const changeNodeType = useCallback(
    (nodeType: InventoryItemType) => setState((previous) => ({ ...previous, nodeType })),
    [setState]
  );

  const changeView = useCallback(
    (view: string) => setState((previous) => ({ ...previous, view: view as InventoryViewOptions })),
    [setState]
  );

  const changeCustomOptions = useCallback(
    (customOptions: Array<{ text: string; field: string }>) =>
      setState((previous) => ({ ...previous, customOptions })),
    [setState]
  );

  const changeAutoBounds = useCallback(
    (autoBounds: boolean) => setState((previous) => ({ ...previous, autoBounds })),
    [setState]
  );

  const changeBoundsOverride = useCallback(
    (boundsOverride: { min: number; max: number }) =>
      setState((previous) => ({ ...previous, boundsOverride })),
    [setState]
  );

  const changeAccount = useCallback(
    (accountId: string) => setState((previous) => ({ ...previous, accountId })),
    [setState]
  );

  const changeRegion = useCallback(
    (region: string) => setState((previous) => ({ ...previous, region })),
    [setState]
  );

  const changeCustomMetrics = useCallback(
    (customMetrics: SnapshotCustomMetricInput[]) => {
      setState((previous) => ({ ...previous, customMetrics }));
    },
    [setState]
  );

  const changeLegend = useCallback(
    (legend: WaffleLegendOptions) => {
      setState((previous) => ({ ...previous, legend }));
    },
    [setState]
  );

  const changeSort = useCallback(
    (sort: WaffleSortOption) => {
      setState((previous) => ({ ...previous, sort }));
    },
    [setState]
  );

  const { inventoryPrefill } = useAlertPrefillContext();
  useEffect(() => {
    const { setNodeType, setMetric, setCustomMetrics, setAccountId, setRegion } = inventoryPrefill;
    setNodeType(state.nodeType);
    setMetric(state.metric);
    setCustomMetrics(state.customMetrics);
    // only shows for AWS when there are accounts info
    setAccountId(state.accountId);
    // only shows for AWS when there are regions info
    setRegion(state.region);
  }, [state, inventoryPrefill]);

  const changeTimelineOpen = useCallback(
    (timelineOpen: boolean) => setState((previous) => ({ ...previous, timelineOpen })),
    [setState]
  );

  return {
    ...DEFAULT_WAFFLE_OPTIONS_STATE,
    ...state,
    changeMetric,
    changeGroupBy,
    changeNodeType,
    changeView,
    changeCustomOptions,
    changeAutoBounds,
    changeBoundsOverride,
    changeAccount,
    changeRegion,
    changeCustomMetrics,
    changeLegend,
    changeSort,
    changeTimelineOpen,
    setWaffleOptionsState: setState,
  };
};

export type WaffleLegendOptions = InventoryLegendOptions;
export type WaffleSortOption = InventorySortOption;
export type WaffleOptionsState = InventoryOptionsState;

const encodeUrlState = (state: InventoryOptionsState) => {
  return inventoryOptionsStateRT.encode(state);
};
const decodeUrlState = (value: unknown) => {
  const state = pipe(inventoryOptionsStateRT.decode(value), fold(constant(undefined), identity));
  if (state) {
    state.source = 'url';
  }
  return state;
};

export const WaffleOptions = createContainer(useWaffleOptions);
export const [WaffleOptionsProvider, useWaffleOptionsContext] = WaffleOptions;
