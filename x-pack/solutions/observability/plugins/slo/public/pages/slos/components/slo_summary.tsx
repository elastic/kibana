/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';

import { useSloFormattedSummary } from '../hooks/use_slo_summary';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { SloSparkline } from './slo_sparkline';

export interface Props {
  slo: SLOWithSummaryResponse;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
}

export function SloSummary({ slo, historicalSummary = [], historicalSummaryLoading }: Props) {
  const { sliValue, sloTarget, errorBudgetRemaining } = useSloFormattedSummary(slo);
  const isSloFailed = slo.summary.status === 'VIOLATED' || slo.summary.status === 'DEGRADING';
  const titleColor = isSloFailed ? 'danger' : '';
  const errorBudgetBurnDownData = formatHistoricalData(historicalSummary, 'error_budget_remaining');
  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false} style={{ maxWidth: 200 }}>
        <EuiFlexGroup
          direction="row"
          responsive={false}
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiStat
              description={i18n.translate('xpack.slo.stats.objective', {
                defaultMessage: '{objective} target',
                values: { objective: sloTarget },
              })}
              title={sliValue}
              textAlign="right"
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SloSparkline
              chart="line"
              id="sli_history"
              state={isSloFailed ? 'error' : 'success'}
              data={historicalSliData}
              isLoading={historicalSummaryLoading}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ maxWidth: 200 }}>
        <EuiFlexGroup
          direction="row"
          responsive={false}
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiStat
              description={i18n.translate('xpack.slo.stats.budgetRemaining', {
                defaultMessage: 'Budget remaining',
              })}
              textAlign="right"
              title={errorBudgetRemaining}
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SloSparkline
              chart="area"
              id="error_budget_burn_down"
              state={isSloFailed ? 'error' : 'success'}
              data={errorBudgetBurnDownData}
              isLoading={historicalSummaryLoading}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
