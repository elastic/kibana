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
import { selectOverviewTrends, trendStatsBatch } from '../apps/synthetics/state';
import type { SyntheticsSuggestion } from '../../common/types';
import type { FlyoutParamProps } from '../apps/synthetics/components/monitors_page/overview/overview/types';

export function SyntheticsSuggestionChildren(props: SuggestionChildrenProps<SyntheticsSuggestion>) {
  const { suggestion } = props;
  const dispatch = useDispatch();
  const trendData = useSelector(selectOverviewTrends);

  const monitors = useMemo(() => {
    const items = Array.isArray(suggestion.data) ? suggestion.data : [];
    return items
      .map((d) => d?.payload as OverviewStatusMetaData | undefined)
      .filter((m): m is OverviewStatusMetaData => !!m);
  }, [suggestion.data]);

  useEffect(() => {
    if (monitors.length === 0) return;
    const pending = monitors
      .map((m) => ({
        configId: m.configId,
        locationId: m.locationId,
        schedule: m.schedule,
      }))
      .filter((r) => !trendData[r.configId + r.locationId]);
    if (pending.length > 0) {
      dispatch(trendStatsBatch.get(pending));
    }
  }, [dispatch, monitors, trendData]);

  if (monitors.length === 0) return null;

  return monitors.map((m) => (
    <MetricItem
      style={{ width: '100%' }}
      key={suggestion.id}
      monitor={m}
      onClick={function (_params: FlyoutParamProps): void {
        throw new Error('Function not implemented.');
      }}
    />
  ));
}
