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
import { TimeSaved } from './time_saved';
import { ExecutiveSummary } from './executive_summary';
import { AlertProcessing } from './alert_processing';
import { useValueMetrics } from './use_value_metrics';

interface Props {
  from: string;
  to: string;
}

export const AIValueMetrics: React.FC<Props> = ({ from, to }) => {
  const minutesPerAlert = 8;
  const analystHourlyRate = 75;
  const { attackAlertIds, isLoading, valueMetrics, valueMetricsCompare } = useValueMetrics({
    from,
    to,
    minutesPerAlert,
  });

  // TODO loading state UI
  return isLoading ? null : (
    <>
      <ExecutiveSummary
        analystHourlyRate={analystHourlyRate}
        filteredAlerts={valueMetrics.filteredAlerts}
        filteredAlertsCompare={valueMetricsCompare.filteredAlerts}
        from={from}
        minutesPerAlert={minutesPerAlert}
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
          <TimeSaved
            minutesPerAlert={minutesPerAlert}
            attackAlertIds={attackAlertIds}
            hoursSaved={valueMetrics.hoursSaved}
            hoursSavedCompare={valueMetricsCompare.hoursSaved}
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
        <CostSavings attackAlertIds={attackAlertIds} from={from} to={to} />
      </EuiFlexGrid>
      <EuiSpacer size="l" />
      <AlertProcessing
        attackAlertIds={attackAlertIds}
        attackAlertsCountPerc={valueMetrics.escalatedAlertsPerc}
        attackAlertsCountPercCompare={valueMetricsCompare.escalatedAlertsPerc}
        filteredAlertsPerc={valueMetrics.filteredAlertsPerc}
        filteredAlertsPercCompare={valueMetricsCompare.filteredAlertsPerc}
        from={from}
        to={to}
      />
    </>
  );
};
