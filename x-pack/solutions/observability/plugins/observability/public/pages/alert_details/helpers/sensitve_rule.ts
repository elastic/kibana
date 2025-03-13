/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IExecutionLogResult } from '@kbn/alerting-plugin/common/execution_log_types';

function calculateMean(totalAlerts: number, totalExecutions: number) {
  return totalExecutions > 0 ? totalAlerts / totalExecutions : 0;
}

function calculateStandardDeviation(alertHistory, mean) {
  const numExecutions = alertHistory.total;
  if (numExecutions === 0) return 0;
  const variance =
    alertHistory.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / numExecutions;
  return Math.sqrt(variance);
}

 const isSensitiveRule = (
  ruleEventLogs: IExecutionLogResult | undefined,
  alertSummary: { activeAlertCount: number; recoveredAlertCount: number }
) => {
  console.log('ruleEventLogs', ruleEventLogs);
  console.log('alertSummary', alertSummary);
  const recentRate = recentExecutions > 0 ? recentAlertCount / recentExecutions : 0;
  const zScore = stdDev > 0 ? (recentRate - mean) / stdDev : 0;
  const isSensitive = zScore > threshold;

  return {
    zScore: zScore.toFixed(2),
    isSensitive,
    message: isSensitive
      ? `🚨 Rule is too sensitive! Z-score: ${zScore.toFixed(2)}`
      : `✅ Rule is within normal limits.`,
  };
};
