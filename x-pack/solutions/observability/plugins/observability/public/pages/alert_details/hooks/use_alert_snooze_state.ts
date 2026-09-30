/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useGetAlertSnoozeStateQuery } from '@kbn/response-ops-alerts-apis/hooks/use_get_alert_snooze_state_query';
import type { TopAlert } from '../../../typings/alerts';
import { useKibana } from '../../../utils/kibana_react';

/**
 * Derives the per-alert snooze/mute state for a single alert on the alert details
 * page. The state lives on the rule saved object (not the alert doc, which only
 * carries boolean flags), so it is fetched via the shared
 * `useGetAlertSnoozeStateQuery`. The alert details page has no
 * `AlertsQueryContext` provider, so the query runs against the default
 * react-query context via `skipAlertsQueryContext`.
 */
export function useAlertSnoozeState(alert: TopAlert | null) {
  const { http, notifications } = useKibana().services;
  const ruleId = alert?.fields[ALERT_RULE_UUID];
  const instanceId = alert?.fields[ALERT_INSTANCE_ID];

  const { data, refetch, isLoading } = useGetAlertSnoozeStateQuery(
    {
      ruleIds: ruleId ? [ruleId] : [],
      http,
      notifications,
      skipAlertsQueryContext: true,
    },
    { enabled: Boolean(ruleId && instanceId) }
  );

  return useMemo(() => {
    const mutedInstances = ruleId ? data?.mutedAlerts[ruleId] ?? [] : [];
    const snoozedInstances = ruleId ? data?.snoozedAlerts[ruleId] ?? [] : [];
    const snoozedInstance = instanceId
      ? snoozedInstances.find((instance) => instance.instanceId === instanceId)
      : undefined;

    return {
      ruleId,
      instanceId,
      isMuted: instanceId ? mutedInstances.includes(instanceId) : false,
      isSnoozed: Boolean(snoozedInstance),
      snoozedInstance,
      refetch,
      isLoading,
    };
  }, [data, instanceId, ruleId, refetch, isLoading]);
}
