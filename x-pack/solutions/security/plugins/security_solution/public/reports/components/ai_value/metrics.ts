/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatNumber } from '@elastic/eui';
import moment from 'moment';
import { getPercChange } from '../../../overview/components/detection_response/soc_trends/helpers';

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
  costSavings: number;
}
export const getValueMetrics = ({
  analystHourlyRate,
  attackDiscoveryCount,
  totalAlerts,
  escalatedAlertsCount,
  minutesPerAlert,
}: {
  attackDiscoveryCount: number;
  totalAlerts: number;
  escalatedAlertsCount: number;
  minutesPerAlert: number;
  analystHourlyRate: number;
}): ValueMetrics => ({
  attackDiscoveryCount,
  filteredAlerts: totalAlerts - escalatedAlertsCount,
  filteredAlertsPerc:
    totalAlerts > 0 ? ((totalAlerts - escalatedAlertsCount) / totalAlerts) * 100 : 0,
  escalatedAlertsPerc: totalAlerts > 0 ? (escalatedAlertsCount / totalAlerts) * 100 : 0,
  hoursSaved: getTimeSavedHours(totalAlerts - escalatedAlertsCount, minutesPerAlert),
  totalAlerts,
  costSavings: getCostSavings({
    alerts: totalAlerts - escalatedAlertsCount,
    analystHourlyRate,
    minutesPerAlert,
  }),
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

export const getFormattedPercChange = (currentCount: number, previousCount: number): string => {
  const percentageChange = getPercChange(currentCount, previousCount) ?? '0.0%';

  const isNegative = percentageChange.charAt(0) === '-';
  return isNegative ? percentageChange.slice(1) : percentageChange;
};

export const getTimeRangeAsDays = ({ from, to }: { from: string; to: string }): string => {
  const duration = moment.duration(moment(to).diff(moment(from)));
  const days = duration.asDays();
  return days < 1 ? `${roundTo(days, 2)}` : `${Math.round(days)}`;
};

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
