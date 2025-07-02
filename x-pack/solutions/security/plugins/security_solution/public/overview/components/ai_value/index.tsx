/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import {
  getTimeSavedHours,
  getCostSavings,
  getAlertStats,
  getAttackDetectionComparison,
  getResponseTimeTrend,
  MINUTES_SAVED_PER_ALERT,
  HOURLY_ANALYST_RATE,
  formatDollars,
  formatThousands,
  formatPercent,
  formatThousandsDecimal,
} from './metrics';

interface Props {}

export const AIValueMetrics: React.FC<Props> = (props) => {
  const data = {
    totalAlerts: 24320,
    filteredAlerts: 24081,
    aiDetected: 120,
    traditionalDetected: 80,
  };

  const hoursSaved = getTimeSavedHours(data.filteredAlerts);
  const costSavings = getCostSavings(data.filteredAlerts);
  const alertStats = getAlertStats({
    totalAlerts: data.totalAlerts,
    filteredAlerts: data.filteredAlerts,
  });
  const detectionComparison = getAttackDetectionComparison(
    data.aiDetected,
    data.traditionalDetected
  );
  console.log('alertStats', alertStats);
  console.log('detectionComparison', detectionComparison);
  const responseTimeTrend = getResponseTimeTrend([30, 28, 32], [20, 18, 22]); // beforeAI and afterAI arrays
  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiText>
        <h3>{'Static data'}</h3>
        <ul>
          <li>{`Minutes saved per alert: ${MINUTES_SAVED_PER_ALERT}`}</li>
          <li>{`Hourly analyst rate: ${formatDollars(HOURLY_ANALYST_RATE)}`}</li>
          <li>{`Total alerts: ${formatThousands(data.totalAlerts)}`}</li>
          <li>{`Filtered alerts: ${formatThousands(data.filteredAlerts)}`}</li>
          <li>{`AI Detected threats: ${formatThousands(data.aiDetected)}`}</li>
          <li>{`Human detected threats: ${formatThousands(data.traditionalDetected)}`}</li>
        </ul>
        <h3>{'Calculated data'}</h3>
        <ul>
          <li>{`Hours saved: ${formatThousandsDecimal(hoursSaved)}`}</li>
          <li>{`Cost savings: ${formatDollars(costSavings)}`}</li>
          <li>{`alertStats.escalated: ${formatThousands(alertStats.escalated)}`}</li>
          <li>{`alertStats.filteredPercentage: ${formatPercent(
            alertStats.filteredPercentage
          )}`}</li>
          <li>{`alertStats.escalatedPercentage: ${formatPercent(
            alertStats.escalatedPercentage
          )}`}</li>
          <li>{`aiPercentage: ${formatPercent(detectionComparison.aiPercentage)}`}</li>
          <li>{`traditionalPercentage: ${formatPercent(
            detectionComparison.traditionalPercentage
          )}`}</li>
          <li>{`responseTimeTrend.averageBeforeAI: ${formatThousands(
            responseTimeTrend.averageBeforeAI
          )}`}</li>
          <li>{`responseTimeTrend.averageAfterAI: ${formatThousands(
            responseTimeTrend.averageAfterAI
          )}`}</li>
          <li>{`responseTimeTrend.improvement: ${formatThousands(
            responseTimeTrend.improvement
          )}`}</li>
          <li>{`responseTimeTrend.improvementPercent: ${formatPercent(
            responseTimeTrend.improvementPercent
          )}`}</li>
        </ul>
      </EuiText>
    </EuiPanel>
  );
};
