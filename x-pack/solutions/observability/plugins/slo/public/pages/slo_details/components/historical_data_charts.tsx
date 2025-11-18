/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import type { TimeBounds } from '../types';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { SliChartPanel } from './sli_chart_panel';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  range?: { from: Date; to: Date };
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function HistoricalDataCharts({ slo, range, isAutoRefreshing, onBrushed }: Props) {
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

  // Calculate observed value from the latest entry in historical data within the time range
  // Historical data is already filtered by the time range when fetched
  const observedValue = React.useMemo(() => {
    if (!sloHistoricalSummary?.data || sloHistoricalSummary.data.length === 0) {
      return undefined;
    }

    // Find the latest entry that is not NO_DATA
    const validEntries = sloHistoricalSummary.data
      .filter((entry) => entry.status !== 'NO_DATA')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return validEntries.length > 0 ? validEntries[0].sliValue : undefined;
  }, [sloHistoricalSummary?.data]);

  return (
    <>
      <EuiFlexItem>
        <SliChartPanel
          data={historicalSliData}
          isLoading={isLoading}
          slo={slo}
          hideMetadata={false}
          observedValue={observedValue}
          onBrushed={onBrushed}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ErrorBudgetChartPanel
          data={errorBudgetBurnDownData}
          isLoading={isLoading}
          slo={slo}
          hideMetadata={false}
          onBrushed={onBrushed}
        />
      </EuiFlexItem>
    </>
  );
}
