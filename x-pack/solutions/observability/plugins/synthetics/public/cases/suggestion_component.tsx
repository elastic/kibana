/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { SuggestionChildrenProps } from '@kbn/cases-plugin/public';
import type { OverviewStatusMetaData } from '../../common/runtime_types';
import { MetricItem } from '../apps/synthetics/components/monitors_page/overview/overview/metric_item/metric_item';
import {
  selectOverviewPageState,
  selectOverviewTrends,
  trendStatsBatch,
} from '../apps/synthetics/state';
import type { SyntheticsSuggestion } from '../../common/types';
import { setFlyoutConfig, setOverviewPageStateAction } from '../apps/synthetics/state/overview';
import { quietFetchOverviewStatusAction } from '../apps/synthetics/state/overview_status';
import type { FlyoutParamProps } from '../apps/synthetics/components/monitors_page/overview/overview/types';

const MonitorItem = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const dispatch = useDispatch();
  const pageState = useSelector(selectOverviewPageState);

  useEffect(() => {
    if (!pageState.monitorQueryIds?.includes(monitor.monitorQueryId)) {
      dispatch(
        setOverviewPageStateAction({
          ...pageState,
          monitorQueryIds: [...(pageState.monitorQueryIds || []), monitor.monitorQueryId],
        })
      );
    }
  }, [dispatch, monitor.monitorQueryId, pageState]);
  const trendData = useSelector(selectOverviewTrends)[monitor.configId + monitor.locationId];

  useEffect(() => {
    if (!trendData) {
      dispatch(
        trendStatsBatch.get([
          {
            configId: monitor.configId,
            locationId: monitor.locationId,
            schedule: monitor.schedule,
          },
        ])
      );
    }
  }, [dispatch, monitor.configId, monitor.locationId, monitor.schedule, pageState, trendData]);

  useEffect(() => {
    dispatch(
      quietFetchOverviewStatusAction.get({
        pageState: {
          ...pageState,
          // only fetch the monitors that are being suggested
          monitorQueryIds: pageState.monitorQueryIds ?? [],
        },
      })
    );
  }, [dispatch, pageState]);
  const setFlyoutConfigCallback = useCallback(
    (params: FlyoutParamProps) => {
      dispatch(setFlyoutConfig(params));
    },
    [dispatch]
  );

  return (
    <MetricItem style={{ width: '100%' }} monitor={monitor} onClick={setFlyoutConfigCallback} />
  );
};

export function SyntheticsSuggestionChildren(props: SuggestionChildrenProps<SyntheticsSuggestion>) {
  const { suggestion } = props;

  const monitors = useMemo<OverviewStatusMetaData[]>(
    () => suggestion.data.map((m) => m.payload),
    [suggestion.data]
  );

  if (monitors.length === 0) return null;

  return monitors.map((monitor) => <MonitorItem key={suggestion.id} monitor={monitor} />);
}
