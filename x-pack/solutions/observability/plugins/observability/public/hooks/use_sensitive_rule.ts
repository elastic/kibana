/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLoadRuleEventLogs } from '@kbn/triggers-actions-ui-plugin/public';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@kbn/alerting-types';

const startDate = 'now-10d';
interface AlertData {
  key: number;
  key_as_string: string;
  doc_count: number;
}
interface AlertSummary {
  activeAlertCount: number;
  activeAlerts: Alert[];
  recoveredAlertCount: number;
}
const useFetchRuleEventLogs = (ruleId?: string) => {
  const loadRuleEventLogs = useLoadRuleEventLogs({
    id: ruleId!,
    dateStart: startDate,
    dateEnd: 'now',
    page: 0,
    perPage: 1000,
  });

  const fetchLogs = useCallback(async () => {
    if (!ruleId) return null;
    return await loadRuleEventLogs.loadEventLogs();
  }, [ruleId, loadRuleEventLogs]);

  return useQuery({
    queryKey: ['ruleEventLogs', ruleId],
    queryFn: fetchLogs,
    enabled: !!ruleId,
  });
};

// const useFetchAlertSummary = (http: HttpSetup, ruleId?: string, ruleTypeId?: string) => {
//   const isValid = !!ruleId && !!ruleTypeId;
//   const nowRef = useRef(new Date());

//   const ruleTypeIds = useMemo(() => (isValid ? [ruleTypeId!] : []), [isValid, ruleTypeId]);
//   console.log('parseTimeExpression', parseTimeExpression(startDate));
//   const timeRange = useMemo(
//     () => ({
//       // utcFrom: new Date(nowRef.current.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
//       utcFrom: parseTimeExpression(startDate),
//       utcTo: nowRef.current.toISOString(),
//       fixedInterval: '1d',
//     }),
//     []
//   );
//   const consumers = ['apm', 'infrastructure', 'logs', 'uptime', 'slo', 'observability', 'alerts'];
//   const filter = useMemo(() => ({ term: { 'kibana.alert.rule.uuid': ruleId } }), [ruleId]);

//   return useQuery({
//     queryKey: ['alertSummary', ruleTypeIds, consumers, filter, timeRange],
//     queryFn: () => fetchAlertSummary({ ruleTypeIds, consumers, filter, http, timeRange }),
//     enabled: isValid,
//   });
// };

const useRuleSensitive = ({ ruleId, ruleTypeId }: { ruleId?: string; ruleTypeId?: string }) => {
  // const { http } = useKibana().services;
  const [state, setState] = useState({ isSensitive: false, zScore: 0, message: '' });
  const { data: eventLogs } = useFetchRuleEventLogs(ruleId);
  // const { data: alertSummaryData } = useFetchAlertSummary(http, ruleId, ruleTypeId);
  const test = calculateZScoresWithExponentialWeighting(eventLogs?.data?.data || [], 0.3);
  console.log('test', test);

  return { state, updateState: setState };
};

// eslint-disable-next-line import/no-default-export
export default useRuleSensitive;

// async function fetchAlertSummary({
//   ruleTypeIds,
//   consumers,
//   filter,
//   http,
//   timeRange: { utcFrom, utcTo, fixedInterval },
// }: {
//   http: HttpSetup;
//   ruleTypeIds: string[];
//   consumers?: string[];
//   timeRange: AlertSummaryTimeRange;
//   filter?: estypes.QueryDslQueryContainer;
// }): Promise<AlertSummary> {
//   const res = ruleTypeIds.length
//     ? await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/_alert_summary`, {
//         body: JSON.stringify({
//           fixed_interval: fixedInterval,
//           gte: utcFrom,
//           lte: utcTo,
//           ruleTypeIds,
//           consumers,
//           filter: [filter],
//         }),
//       })
//     : {};

//   const activeAlertCount = res?.activeAlertCount ?? 0;
//   const activeAlerts = res?.activeAlerts ?? [];
//   const recoveredAlertCount = res?.recoveredAlertCount ?? 0;

//   return {
//     activeAlertCount,
//     activeAlerts,
//     recoveredAlertCount,
//   };
// }

interface RuleExecution {
  timestamp: string;
  num_new_alerts: number;
  rule_id: string;
}

function getScalingFactor(executionIntervalSeconds: number): number {
  if (executionIntervalSeconds <= 600) return 3600; // Normalize to per hour (if rule runs ≤ every 10 min)
  if (executionIntervalSeconds <= 86400) return 86400; // Normalize to per day (if rule runs ≤ every 24h)
  return 604800; // Normalize to per week (if rule runs less frequently)
}

function calculateZScoresWithExponentialWeighting(
  executions: RuleExecution[],
  alpha: number = 0.2 // Controls how fast old data fades (0.1 = slow, 0.3 = fast)
): Array<{ timestamp: string; zScore: number | null }> {
  if (executions.length < 2) return [];

  const executionIntervalSeconds = estimateExecutionInterval(executions);
  if (!executionIntervalSeconds) return [];

  const scalingFactor = getScalingFactor(executionIntervalSeconds);

  // Convert num_new_alerts to "alerts per normalized time unit"
  const alertsPerUnit = executions.map(
    (exe) => (exe.num_new_alerts / executionIntervalSeconds) * scalingFactor
  );

  if (alertsPerUnit.length < 2) return [];

  let ewmaMean = alertsPerUnit[0]; // Start with first value
  let ewmaVar = 0; // Initial variance

  return executions.map((execution, index) => {
    if (index === 0) return { timestamp: execution.timestamp, zScore: null };

    // Update Exponentially Weighted Moving Average (EWMA) Mean & Variance
    ewmaMean = alpha * alertsPerUnit[index] + (1 - alpha) * ewmaMean;
    ewmaVar = alpha * Math.pow(alertsPerUnit[index] - ewmaMean, 2) + (1 - alpha) * ewmaVar;
    const ewmaStdDev = Math.sqrt(ewmaVar);

    const zScore = ewmaStdDev > 0 ? (alertsPerUnit[index] - ewmaMean) / ewmaStdDev : null;

    return { timestamp: execution.timestamp, zScore };
  });
}

function estimateExecutionInterval(executions: RuleExecution[]): number | null {
  if (executions.length < 2) return null;

  // Convert timestamps to sorted list of execution times (in seconds)
  const timestamps = executions
    .map((exe) => new Date(exe.timestamp).getTime() / 1000)
    .sort((a, b) => a - b);

  // Compute intervals between consecutive executions
  const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]);

  // Use median interval to reduce impact of outliers
  intervals.sort((a, b) => a - b);
  const mid = Math.floor(intervals.length / 2);
  const medianInterval =
    intervals.length % 2 === 0 ? (intervals[mid - 1] + intervals[mid]) / 2 : intervals[mid];

  return medianInterval;
}
