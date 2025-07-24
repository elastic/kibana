/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { CostSavingsDiv } from './cost_savings_div';
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
        valueMetrics={valueMetrics}
        valueMetricsCompare={valueMetricsCompare}
        minutesPerAlert={minutesPerAlert}
        analystHourlyRate={analystHourlyRate}
        attackAlertIds={attackAlertIds}
        filteredAlerts={valueMetrics.filteredAlerts}
        filteredAlertsCompare={valueMetricsCompare.filteredAlerts}
        from={from}
        to={to}
      />
      <EuiSpacer size="l" />
      <EuiFlexGrid columns={2} gutterSize="l">
        <CostSavingsDiv attackAlertIds={attackAlertIds} from={from} to={to} />
        <AlertProcessing
          attackAlertIds={attackAlertIds}
          filteredAlertsPerc={valueMetrics.filteredAlertsPerc}
          filteredAlertsPercCompare={valueMetricsCompare.filteredAlertsPerc}
          attackAlertsCountPerc={valueMetrics.escalatedAlertsPerc}
          attackAlertsCountPercCompare={valueMetricsCompare.escalatedAlertsPerc}
          from={from}
          to={to}
        />
      </EuiFlexGrid>
    </>
  );
};
