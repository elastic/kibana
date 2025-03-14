/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { AlertInsight, AlertInsightType } from '../types';

export const getAlertInsights = (
  alert: any,
  groupBuckets: any,
  ruleBuckets: any,
  alertsData: any
): AlertInsight[] => {
  const sameSourceBuckets = groupBuckets?.filter(
    (bucket: any) => bucket.key === alert.fields[ALERT_INSTANCE_ID]
  );

  const sameRuleBuckets = ruleBuckets?.find(
    (bucket: any) => bucket.key === alert.fields[ALERT_RULE_UUID]
  );

  const otherSourceBuckets = groupBuckets?.filter(
    (bucket: any) => bucket.key !== alert.fields[ALERT_INSTANCE_ID]
  );

  const otherRuleBuckets = ruleBuckets?.filter(
    (bucket: any) => bucket.key !== alert.fields[ALERT_RULE_UUID]
  );

  const alertsOnSameSource =
    sameSourceBuckets
      ?.map((bucket: any) => bucket.doc_count)
      .reduce((acc: any, curr: any) => acc + curr, 0) ?? 0;

  const alertsOnSameRule = sameRuleBuckets?.doc_count ?? 0;

  const alertsOnOtherSources =
    otherSourceBuckets
      ?.map((bucket: any) => bucket.doc_count)
      .reduce((acc: any, curr: any) => acc + curr, 0) ?? 0;

  const alertsOnOtherSourcesTooltip = otherSourceBuckets
    ?.map((bucket: any) => `{${bucket.key}}`)
    ?.join(', ');

  const alertsOnOtherRules =
    otherRuleBuckets
      ?.map((bucket: any) => bucket.doc_count)
      .reduce((acc: any, curr: any) => acc + curr, 0) ?? 0;

  const alertsOnOtherRulesTooltip = otherRuleBuckets
    ?.map((bucket: any) => `{${bucket.key}}`)
    ?.join(',');

  const totalUniqueAlerts =
    alertsData?.alerts?.filter((alertData: any) => String(alertData[ALERT_INSTANCE_ID]) !== '*')
      ?.length ?? 0;

  const totalUniqueAlertsTooltip =
    alertsData?.alerts?.map((alertData: any) => `{${String(alertData[ALERT_UUID])}}`)?.join(',') ??
    '';

  const alertInsights: AlertInsight[] = [];

  alertInsights.push(
    {
      type: AlertInsightType.SameSource,
      alertsCount: alertsOnSameSource,
      title: 'Same source',
      tooltip: alert.fields[ALERT_INSTANCE_ID],
    },
    {
      type: AlertInsightType.SameRule,
      alertsCount: alertsOnSameRule,
      title: 'Same rule',
      tooltip: alert.fields[ALERT_RULE_UUID],
    },
    {
      type: AlertInsightType.OtherSources,
      alertsCount: alertsOnOtherSources,
      title: 'Other sources',
      tooltip: alertsOnOtherSourcesTooltip,
    },
    {
      type: AlertInsightType.OtherRules,
      alertsCount: alertsOnOtherRules,
      title: 'Other rules',
      tooltip: alertsOnOtherRulesTooltip,
    },
    {
      type: AlertInsightType.TotalUniqueAlerts,
      alertsCount: totalUniqueAlerts,
      title: 'Total unique alerts',
      tooltip: totalUniqueAlertsTooltip,
    }
  );

  return alertInsights;
};
