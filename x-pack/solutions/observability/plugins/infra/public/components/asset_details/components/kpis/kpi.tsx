/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { LensMetricConfig } from '@kbn/lens-embeddable-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { METRICS_TOOLTIP, KPI_CHART_HEIGHT } from '../../../../common/visualizations';
import { LensChart, TooltipContent } from '../../../lens';

const createMetricValueDataset = ({
  title,
  value,
}: {
  title: string;
  value: number;
}): Datatable => ({
  type: 'datatable',
  columns: [
    {
      id: title,
      name: title,
      meta: {
        type: 'number',
      },
    },
  ],
  rows: [{ [title]: value }],
});

const getLensConfig = (chartProps: LensMetricConfig, valueOverride?: number): LensMetricConfig => {
  if (valueOverride === undefined) {
    return chartProps;
  }

  return {
    ...chartProps,
    dataset: createMetricValueDataset({
      title: chartProps.title,
      value: valueOverride,
    }),
    value: chartProps.title,
    queryMaxValue: undefined,
    querySecondaryMetric: undefined,
    trendLine: undefined,
    breakdown: undefined,
  };
};

export const Kpi = ({
  id,
  dateRange,
  query,
  filters,
  lastReloadRequestTime,
  loading,
  valueOverride,
  ...chartProps
}: LensMetricConfig & {
  id: string;
  dateRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  searchSessionId?: string;
  loading?: boolean;
  lastReloadRequestTime?: number;
  valueOverride?: number;
}) => {
  const lensConfig = useMemo(
    () => getLensConfig(chartProps, valueOverride),
    [chartProps, valueOverride]
  );
  const tooltipContent = useMemo(
    () =>
      id in METRICS_TOOLTIP ? (
        <TooltipContent description={METRICS_TOOLTIP[id as keyof typeof METRICS_TOOLTIP]} />
      ) : undefined,
    [id]
  );

  return (
    <LensChart
      id={`infraAssetDetailsKPI${id}`}
      dateRange={dateRange}
      height={KPI_CHART_HEIGHT}
      filters={filters}
      lensAttributes={lensConfig}
      query={query}
      loading={loading}
      toolTip={tooltipContent}
      lastReloadRequestTime={lastReloadRequestTime}
      disableTriggers
      hidePanelTitles
    />
  );
};
