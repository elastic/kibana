/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatNumber } from '@elastic/eui';
export const MINUTES_SAVED_PER_ALERT = 4;
export const HOURLY_ANALYST_RATE = 70;

// Define AlertData type if not already imported
export interface AlertData {
  totalAlerts: number;
  filteredAlerts: number;
}

export const getTimeSavedHours = (filteredAlerts: number): number => {
  const totalMinutesSaved = filteredAlerts * MINUTES_SAVED_PER_ALERT;
  return totalMinutesSaved / 60;
};

export const getCostSavings = (filteredAlerts: number): number => {
  const hoursSaved = getTimeSavedHours(filteredAlerts);
  return hoursSaved * HOURLY_ANALYST_RATE;
};

export const getAlertStats = (alertData: AlertData) => {
  const escalated = alertData.totalAlerts - alertData.filteredAlerts;
  return {
    escalated,
    filteredPercentage: (alertData.filteredAlerts / alertData.totalAlerts) * 100,
    escalatedPercentage: (escalated / alertData.totalAlerts) * 100,
  };
};

export const getAttackDetectionComparison = (aiDetected: number, traditionalDetected: number) => {
  const total = aiDetected + traditionalDetected;
  return {
    aiPercentage: (aiDetected / total) * 100,
    traditionalPercentage: (traditionalDetected / total) * 100,
  };
};

export const getResponseTimeTrend = (beforeAI: number[], afterAI: number[]) => {
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    averageBeforeAI: avg(beforeAI),
    averageAfterAI: avg(afterAI),
    improvement: avg(beforeAI) - avg(afterAI),
    improvementPercent: ((avg(beforeAI) - avg(afterAI)) / avg(beforeAI)) * 100,
  };
};

export const formatDollars = (value: number) =>
  formatNumber(value, {
    format: '$0,0', // e.g., $1,234,567
    nil: '-',
    round: true,
  });

export const formatThousandsDecimal = (value: number) =>
  formatNumber(value, {
    format: '0,0.0',
  });

export const formatThousands = (value: number) =>
  formatNumber(value, {
    format: '0,0',
  });

export const formatPercent = (value: number) =>
  formatNumber(value, {
    format: '0%', // percentage with 2 decimals
  });
