/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { constant, identity } from 'fp-ts/function';
import createContainer from 'constate';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { type InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type {
  InventoryView,
  InventoryViewOptions,
} from '../../../../../common/inventory_views/types';
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
import { useInventoryViewsContext } from './use_inventory_views';

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
  preferredSchema: null,
};

function mapInventoryViewToState(savedView: InventoryView): WaffleOptionsState {
  const {
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    autoBounds,
    boundsOverride,
    accountId,
    region,
    customMetrics,
    legend,
    sort,
    timelineOpen,
    preferredSchema = 'ecs',
  } = savedView.attributes;

  return {
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    autoBounds,
    boundsOverride,
    accountId,
    region,
    customMetrics,
    legend,
    sort,
    timelineOpen,
    preferredSchema,
  };
}

export const useWaffleOptions = () => {
  const { currentView } = useInventoryViewsContext();

  const [urlState, setUrlState] = useUrlState<WaffleOptionsState>({
    defaultState: currentView ? mapInventoryViewToState(currentView) : DEFAULT_WAFFLE_OPTIONS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleOptions',
  });

  const previousViewId = useRef<string | undefined>(currentView?.id);
  useEffect(() => {
    if (currentView && currentView.id !== previousViewId.current) {
      setUrlState(mapInventoryViewToState(currentView));
      previousViewId.current = currentView.id;
    }
  }, [currentView, setUrlState]);

  const changeMetric = useCallback(
    (metric: SnapshotMetricInput) => setUrlState((previous) => ({ ...previous, metric })),
    [setUrlState]
  );

  const changeGroupBy = useCallback(
    (groupBy: SnapshotGroupBy) => setUrlState((previous) => ({ ...previous, groupBy })),
    [setUrlState]
  );

  const changeNodeType = useCallback(
    (nodeType: InventoryItemType) => setUrlState((previous) => ({ ...previous, nodeType })),
    [setUrlState]
  );

  const changeView = useCallback(
    (view: string) =>
      setUrlState((previous) => ({ ...previous, view: view as InventoryViewOptions })),
    [setUrlState]
  );

  const changeCustomOptions = useCallback(
    (customOptions: Array<{ text: string; field: string }>) =>
      setUrlState((previous) => ({ ...previous, customOptions })),
    [setUrlState]
  );

  const changeAutoBounds = useCallback(
    (autoBounds: boolean) => setUrlState((previous) => ({ ...previous, autoBounds })),
    [setUrlState]
  );

  const changeBoundsOverride = useCallback(
    (boundsOverride: { min: number; max: number }) =>
      setUrlState((previous) => ({ ...previous, boundsOverride })),
    [setUrlState]
  );

  const changeAccount = useCallback(
    (accountId: string) => setUrlState((previous) => ({ ...previous, accountId })),
    [setUrlState]
  );

  const changeRegion = useCallback(
    (region: string) => setUrlState((previous) => ({ ...previous, region })),
    [setUrlState]
  );

  const changeCustomMetrics = useCallback(
    (customMetrics: SnapshotCustomMetricInput[]) => {
      setUrlState((previous) => ({ ...previous, customMetrics }));
    },
    [setUrlState]
  );

  const changeLegend = useCallback(
    (legend: WaffleLegendOptions) => {
      setUrlState((previous) => ({ ...previous, legend }));
    },
    [setUrlState]
  );

  const changeSort = useCallback(
    (sort: WaffleSortOption) => {
      setUrlState((previous) => ({ ...previous, sort }));
    },
    [setUrlState]
  );

  const changePreferredSchema = useCallback(
    (preferredSchema: DataSchemaFormat | null) => {
      setUrlState((previous) => ({
        ...previous,
        preferredSchema,
        metric: DEFAULT_WAFFLE_OPTIONS_STATE.metric,
        groupBy: DEFAULT_WAFFLE_OPTIONS_STATE.groupBy,
      }));
    },
    [setUrlState]
  );

  const { inventoryPrefill } = useAlertPrefillContext();
  useEffect(() => {
    const { setNodeType, setMetric, setCustomMetrics, setAccountId, setRegion } = inventoryPrefill;
    setNodeType(urlState.nodeType);
    setMetric(urlState.metric);
    setCustomMetrics(urlState.customMetrics);
    // only shows for AWS when there are accounts info
    setAccountId(urlState.accountId);
    // only shows for AWS when there are regions info
    setRegion(urlState.region);
  }, [urlState, inventoryPrefill]);

  const changeTimelineOpen = useCallback(
    (timelineOpen: boolean) => setUrlState((previous) => ({ ...previous, timelineOpen })),
    [setUrlState]
  );

  return {
    ...urlState,
    preferredSchema:
      urlState.preferredSchema === null ? ('ecs' as DataSchemaFormat) : urlState.preferredSchema,
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
    changePreferredSchema,
    setWaffleOptionsState: setUrlState,
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
