/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
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
import type { FlyoutParamProps } from '../apps/synthetics/components/monitors_page/overview/overview/types';
import { quietFetchOverviewStatusAction } from '../apps/synthetics/state/overview_status';

const MonitorItem = ({
  monitor,
  suggestionId,
}: {
  monitor: OverviewStatusMetaData;
  suggestionId: string;
}) => {
  const dispatch = useDispatch();
  const trendData = useSelector(selectOverviewTrends)[monitor.configId + monitor.locationId];

  const pageState = useSelector(selectOverviewPageState);
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
    dispatch(quietFetchOverviewStatusAction.get({ pageState }));
  }, [dispatch, pageState]);

  return (
    <MetricItem
      style={{ width: '100%' }}
      monitor={monitor}
      onClick={function (_params: FlyoutParamProps): void {
        throw new Error('Function not implemented.');
      }}
    />
  );
};

export function SyntheticsSuggestionChildren(props: SuggestionChildrenProps<SyntheticsSuggestion>) {
  const { suggestion } = props;

  const monitors = useMemo(() => {
    const items = Array.isArray(suggestion.data) ? suggestion.data : [];
    return items
      .map((monitorSuggestion) => monitorSuggestion?.payload as OverviewStatusMetaData | undefined)
      .filter((m): m is OverviewStatusMetaData => !!m);
  }, [suggestion.data]);

  if (monitors.length === 0) return null;

  return monitors.map((m) => (
    <MonitorItem key={suggestion.id} monitor={m} suggestionId={suggestion.id} />
  ));
}
