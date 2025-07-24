/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatNumber } from '@elastic/eui';
import { getPercChange } from '../detection_response/soc_trends/helpers';

// Define AlertData type if not already imported
export interface AlertData {
  totalAlerts: number;
  filteredAlerts: number;
}
export interface ValueMetrics {
  attackDiscoveryCount: number;
  filteredAlerts: number;
  filteredAlertsPerc: number;
  escalatedAlertsPerc: number;
  hoursSaved: number;
  totalAlerts: number;
}
export const getValueMetrics = ({
  attackDiscoveryCount,
  totalAlerts,
  attackAlertsCount,
  minutesPerAlert,
}: {
  attackDiscoveryCount: number;
  totalAlerts: number;
  attackAlertsCount: number;
  minutesPerAlert: number;
}): ValueMetrics => ({
  attackDiscoveryCount,
  filteredAlerts: totalAlerts - attackAlertsCount,
  filteredAlertsPerc: ((totalAlerts - attackAlertsCount) / totalAlerts) * 100,
  escalatedAlertsPerc: (attackAlertsCount / totalAlerts) * 100,
  hoursSaved: getTimeSavedHours(totalAlerts - attackAlertsCount, minutesPerAlert),
  totalAlerts,
});

export const getTimeSavedHours = (alerts: number, minutesPerAlert: number): number => {
  const totalMinutesSaved = alerts * minutesPerAlert;
  return totalMinutesSaved / 60;
};

export const getCostSavings = ({
  alerts,
  minutesPerAlert,
  analystHourlyRate,
}: {
  alerts: number;
  minutesPerAlert: number;
  analystHourlyRate: number;
}): number => {
  const hoursSaved = getTimeSavedHours(alerts, minutesPerAlert);
  return hoursSaved * analystHourlyRate;
};

export const formatDollars = (value: number) =>
  formatNumber(roundTo(value, 2), {
    format: '$0,0', // e.g., $1,234,567
    nil: '-',
    round: true,
  });

export const formatThousands = (value: number) =>
  formatNumber(roundTo(value, 0), {
    format: '0,0',
  });

export const formatPercent = (value: number) =>
  `${formatNumber(roundTo(value, 2), { format: '0.00' })}%`;

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const getFormattedPercChange = (currentCount: number, previousCount: number): string => {
  const percentageChange = getPercChange(currentCount, previousCount) ?? '0.0%';

  const isNegative = percentageChange.charAt(0) === '-';
  return isNegative ? percentageChange.slice(1) : percentageChange;
};
