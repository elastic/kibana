/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CostSavings } from './cost_savings';
import {
  getTimeSavedHours,
  getAlertStats,
  getAttackDetectionComparison,
  getResponseTimeTrend,
} from './metrics';

interface Props {
  attackAlertsCountCompare: number;
  attackAlertsCount: number;
  attackAlertIds: string[];
  attackDiscoveryCount: number;
  totalAlerts: number;
  totalAlertsCompare: number;
  from: string;
  to: string;
}

export const AIValueMetrics: React.FC<Props> = ({
  attackAlertsCountCompare,
  attackAlertsCount,
  attackAlertIds,
  attackDiscoveryCount,
  totalAlerts,
  totalAlertsCompare,
  from,
  to,
}) => {
  const data = {
    totalAlerts,
    filteredAlerts: totalAlerts - attackAlertsCount,
    filteredAlertsCompare: totalAlertsCompare - attackAlertsCountCompare,
    aiDetected: attackDiscoveryCount,
    traditionalDetected: 80,
  };

  const hoursSaved = getTimeSavedHours(data.filteredAlerts);
  const alertStats = getAlertStats({
    totalAlerts: data.totalAlerts,
    filteredAlerts: data.filteredAlerts,
  });
  const detectionComparison = getAttackDetectionComparison(
    data.aiDetected,
    data.traditionalDetected
  );

  const responseTimeTrend = getResponseTimeTrend([30, 28, 32], [20, 18, 22]); // beforeAI and afterAI arrays

  return (
    <>
      <CostSavings
        from={from}
        to={to}
        attackAlertIds={attackAlertIds}
        filteredAlerts={data.filteredAlerts}
        filteredAlertsCompare={data.filteredAlertsCompare}
      />
      <EuiSpacer size="l" />

      <EuiFlexGrid columns={3} gutterSize="l" responsive={false}>
        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Real threats detected'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat title="14" description="AI-identified genuine threats" titleColor="accent" />
          <EuiText size="s">{'+45 % over the last 30 days'}</EuiText>
        </EuiPanel>

        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Alert filtering rate'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat title="89.7%" description="AI-filtered false positives" />
          <EuiText size="s">{'+28 % over the last 30 days'}</EuiText>
        </EuiPanel>

        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Analyst time saved'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat title="3,211h" description="Time saved" />
          <EuiText size="s">{'+31 % over the last 30 days'}</EuiText>
          <EuiText size="s">{'You didn’t need to hire ~2 extra analysts'}</EuiText>
        </EuiPanel>
      </EuiFlexGrid>

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={2} gutterSize="l" responsive={false}>
        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Response time analysis'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {/* Replace with your EuiChart component */}
          {/* <ResponseTimeChart />*/}
          <EuiText size="s">{'3.7m Avg AI response, 25.7m Avg traditional'}</EuiText>
        </EuiPanel>

        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Alert processing analytics'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {/* Replace with EuiChart or pie chart */}
          {/* <AlertProcessingPie />*/}
          <EuiText size="s">{'Total alerts processed: 13,890'}</EuiText>
        </EuiPanel>
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
  );
};
