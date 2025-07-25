/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { CostSavings } from './cost_savings';
import { CostSavingsTrend } from './cost_savings_trend';
import { TimeSaved } from './time_saved';
import { ExecutiveSummary } from './executive_summary';
import { AlertProcessing } from './alert_processing';
import { useValueMetrics } from './use_value_metrics';

interface Props {
  from: string;
  to: string;
}

export const AIValueMetrics: React.FC<Props> = ({ from, to }) => {
  // TODO: make these configurable
  const minutesPerAlert = 8;
  const analystHourlyRate = 75;

  const { attackAlertIds, isLoading, valueMetrics, valueMetricsCompare } = useValueMetrics({
    from,
    to,
    minutesPerAlert,
    analystHourlyRate,
  });

  // TODO loading state UI
  return isLoading ? null : (
    <>
      <ExecutiveSummary
        from={from}
        to={to}
        valueMetrics={valueMetrics}
        valueMetricsCompare={valueMetricsCompare}
      />
      <EuiSpacer size="l" />

      <EuiFlexGrid
        columns={2}
        gutterSize="l"
        css={css`
          grid-template-columns: 30% 68%;
        `}
      >
        <EuiFlexGrid columns={1} gutterSize="l" responsive={false}>
          <CostSavings
            analystHourlyRate={analystHourlyRate}
            attackAlertIds={attackAlertIds}
            costSavings={valueMetrics.costSavings}
            costSavingsCompare={valueMetricsCompare.costSavings}
            minutesPerAlert={minutesPerAlert}
            from={from}
            to={to}
          />
          <TimeSaved
            minutesPerAlert={minutesPerAlert}
            attackAlertIds={attackAlertIds}
            hoursSaved={valueMetrics.hoursSaved}
            hoursSavedCompare={valueMetricsCompare.hoursSaved}
            from={from}
            to={to}
          />
        </EuiFlexGrid>
        <CostSavingsTrend
          analystHourlyRate={analystHourlyRate}
          attackAlertIds={attackAlertIds}
          minutesPerAlert={minutesPerAlert}
          from={from}
          to={to}
        />
      </EuiFlexGrid>
      <EuiSpacer size="l" />
      <AlertProcessing
        attackAlertIds={attackAlertIds}
        escalatedAlertsCountPerc={valueMetrics.escalatedAlertsPerc}
        escalatedAlertsCountPercCompare={valueMetricsCompare.escalatedAlertsPerc}
        filteredAlertsPerc={valueMetrics.filteredAlertsPerc}
        filteredAlertsPercCompare={valueMetricsCompare.filteredAlertsPerc}
        from={from}
        to={to}
      />
    </>
  );
};
