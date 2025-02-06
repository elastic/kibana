/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { TimeBounds } from '../types';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { SliChartPanel } from './sli_chart_panel';
import { SloTabId } from './slo_details';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
  range?: { from: Date; to: Date };
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function HistoricalDataCharts({
  slo,
  range,
  isAutoRefreshing,
  selectedTabId,
  onBrushed,
}: Props) {
  const { data: historicalSummaries = [], isLoading: historicalSummaryLoading } =
    useFetchHistoricalSummary({
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
          isLoading={historicalSummaryLoading}
          slo={slo}
          selectedTabId={selectedTabId}
          onBrushed={onBrushed}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ErrorBudgetChartPanel
          data={errorBudgetBurnDownData}
          isLoading={historicalSummaryLoading}
          slo={slo}
          selectedTabId={selectedTabId}
          onBrushed={onBrushed}
        />
      </EuiFlexItem>
    </>
  );
}
