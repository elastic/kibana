/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useFetchHistoricalSummary } from '../../../../hooks/use_fetch_historical_summary';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import type { TimeBounds } from '../../types';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { SliChartPanel } from './sli_chart_panel';
import { useSloDetailsContext } from '../slo_details_context';

export interface Props {
  range?: { from: Date; to: Date };
  onBrushed?: (timeBounds: TimeBounds) => void;
  hideHeaderDurationLabel?: boolean;
}

export function HistoricalDataCharts({ range, onBrushed, hideHeaderDurationLabel = false }: Props) {
  const { slo, isAutoRefreshing } = useSloDetailsContext();
  const { data: historicalSummaries = [], isLoading } = useFetchHistoricalSummary({
    sloList: [slo],
    shouldRefetch: isAutoRefreshing,
    range,
  });

  const sloHistoricalSummary = historicalSummaries.find(
    (historicalSummary) =>
      historicalSummary.sloId === slo.id && historicalSummary.instanceId === slo.instanceId
  );

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummary?.data,
    'error_budget_remaining'
  );
  const historicalSliData = formatHistoricalData(sloHistoricalSummary?.data, 'sli_value');

  return (
    <>
      <EuiFlexItem>
        <SliChartPanel
          data={historicalSliData}
          isLoading={isLoading}
          onBrushed={onBrushed}
          hideHeaderDurationLabel={hideHeaderDurationLabel}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ErrorBudgetChartPanel
          data={errorBudgetBurnDownData}
          isLoading={isLoading}
          onBrushed={onBrushed}
          hideHeaderDurationLabel={hideHeaderDurationLabel}
        />
      </EuiFlexItem>
    </>
  );
}
