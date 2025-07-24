/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';
import { AlertProcessing } from './alert_processing';
import { useValueMetrics } from './use_value_metrics';
import { ThreatsDetected } from './threats_detected';
import { FilteringRate } from './filtering_rate';
import { TimeSaved } from './time_saved';
import { CostSavings } from './cost_savings';

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
      <CostSavings
        minutesPerAlert={minutesPerAlert}
        analystHourlyRate={analystHourlyRate}
        attackAlertIds={attackAlertIds}
        filteredAlerts={valueMetrics.filteredAlerts}
        filteredAlertsCompare={valueMetricsCompare.filteredAlerts}
        from={from}
        to={to}
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
          <ThreatsDetected
            attackDiscoveryCount={valueMetrics.attackDiscoveryCount}
            attackDiscoveryCountCompare={valueMetricsCompare.attackDiscoveryCount}
            from={from}
            to={to}
          />
          <FilteringRate
            attackAlertIds={attackAlertIds}
            totalAlerts={valueMetrics.totalAlerts}
            filteredAlertsPerc={valueMetrics.filteredAlertsPerc}
            filteredAlertsPercCompare={valueMetricsCompare.filteredAlertsPerc}
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

      <EuiSpacer size="l" />

      <EuiText size="xs">
        {i18n.COST_CALCULATIONS}
        {/* TODO build out settings page to change this value
        <EuiLink href="#">{'Change rate in settings'}</EuiLink>*/}
      </EuiText>
    </>
  );
};
