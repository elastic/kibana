/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { CostSavingsTrend } from './cost_savings_trend';
import { ExecutiveSummary } from './executive_summary';
import { AlertProcessing } from './alert_processing';
import { useValueMetrics } from './use_value_metrics';

interface Props {
  setHasAttackDiscoveries: React.Dispatch<boolean>;
  from: string;
  to: string;
}

export const AIValueMetrics: React.FC<Props> = ({ setHasAttackDiscoveries, from, to }) => {
  // TODO: make these configurable
  const minutesPerAlert = 8;
  const analystHourlyRate = 75;

  const { isLoading, valueMetrics, valueMetricsCompare } = useValueMetrics({
    from,
    to,
    minutesPerAlert,
    analystHourlyRate,
  });

  const hasAttackDiscoveries = useMemo(
    () => valueMetrics.attackDiscoveryCount > 0,
    [valueMetrics.attackDiscoveryCount]
  );

  useEffect(() => {
    setHasAttackDiscoveries(hasAttackDiscoveries);
  }, [hasAttackDiscoveries, setHasAttackDiscoveries]);

  // TODO loading state UI
  return isLoading ? null : (
    <>
      <ExecutiveSummary
        analystHourlyRate={analystHourlyRate}
        hasAttackDiscoveries={hasAttackDiscoveries}
        minutesPerAlert={minutesPerAlert}
        from={from}
        to={to}
        valueMetrics={valueMetrics}
        valueMetricsCompare={valueMetricsCompare}
      />
      <EuiSpacer size="l" />

      {hasAttackDiscoveries && (
        <EuiFlexGrid columns={2} gutterSize="l">
          <AlertProcessing valueMetrics={valueMetrics} valueMetricsCompare={valueMetricsCompare} />
          <CostSavingsTrend
            analystHourlyRate={analystHourlyRate}
            minutesPerAlert={minutesPerAlert}
            from={from}
            to={to}
          />
        </EuiFlexGrid>
      )}
    </>
  );
};
