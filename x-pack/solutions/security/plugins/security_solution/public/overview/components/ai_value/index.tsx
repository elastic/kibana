/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { AlertProcessing } from './alert_processing';
import { ResponseTime } from './response_time';
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
  //
  // const hoursSaved = getTimeSavedHours(data.filteredAlerts);
  // const alertStats = getAlertStats({
  //   totalAlerts: data.totalAlerts,
  //   filteredAlerts: data.filteredAlerts,
  // });
  // const detectionComparison = getAttackDetectionComparison(
  //   data.aiDetected,
  //   data.traditionalDetected
  // );
  //
  // const responseTimeTrend = getResponseTimeTrend([30, 28, 32], [20, 18, 22]); // beforeAI and afterAI arrays
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

      <EuiFlexGrid columns={3} gutterSize="l" responsive={false}>
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

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={2} gutterSize="l" responsive={false}>
        <ResponseTime from={from} to={to} />
        <AlertProcessing attackAlertIds={attackAlertIds} from={from} to={to} />
      </EuiFlexGrid>

      <EuiSpacer size="l" />

      <EuiPanel paddingSize="l">
        <EuiTitle size="s">
          <h3>{'Threat detection comparison'}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {/* Replace with bar chart */}
        {/* <ThreatDetectionComparisonChart />*/}
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiText size="xs">
        {'Cost calculations: Time saved × average analyst hourly rate: $75/h.'}{' '}
        <EuiLink href="#">{'Change rate in settings'}</EuiLink>
      </EuiText>
    </>
  );
  // <EuiPanel hasBorder paddingSize="xl">
  //   <EuiText>
  //     <h3>{'Static data'}</h3>
  //     <ul>
  //       <li>{`Minutes saved per alert: ${MINUTES_SAVED_PER_ALERT}`}</li>
  //       <li>{`Hourly analyst rate: ${formatDollars(HOURLY_ANALYST_RATE)}`}</li>
  //       <li>{`Total alerts: ${formatThousands(data.totalAlerts)}`}</li>
  //       <li>{`Filtered alerts: ${formatThousands(data.filteredAlerts)}`}</li>
  //       <li>{`AI Detected threats: ${formatThousands(data.aiDetected)}`}</li>
  //       <li>{`Human detected threats: ${formatThousands(data.traditionalDetected)}`}</li>
  //     </ul>
  //     <h3>{'Calculated data'}</h3>
  //     <ul>
  //       <li>{`Hours saved: ${formatThousandsDecimal(hoursSaved)}`}</li>
  //       <li>{`Cost savings: ${formatDollars(costSavings)}`}</li>
  //       <li>{`Alerts escalated: ${formatThousands(alertStats.escalated)}`}</li>
  //       <li>{`Alerts filteredPercentage: ${formatPercent(alertStats.filteredPercentage)}`}</li>
  //       <li>{`Alerts escalatedPercentage: ${formatPercent(alertStats.escalatedPercentage)}`}</li>
  //       <li>{`aiPercentage: ${formatPercent(detectionComparison.aiPercentage)}`}</li>
  //       <li>{`traditionalPercentage: ${formatPercent(
  //         detectionComparison.traditionalPercentage
  //       )}`}</li>
  //       <li>{`Response time averageBeforeAI: ${formatThousands(
  //         responseTimeTrend.averageBeforeAI
  //       )}`}</li>
  //       <li>{`Response time averageAfterAI: ${formatThousands(
  //         responseTimeTrend.averageAfterAI
  //       )}`}</li>
  //       <li>{`Response time improvement: ${formatThousands(responseTimeTrend.improvement)}`}</li>
  //       <li>{`Response time improvementPercent: ${formatPercent(
  //         responseTimeTrend.improvementPercent
  //       )}`}</li>
  //     </ul>
  //   </EuiText>
  // </EuiPanel>
};
