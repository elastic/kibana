/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { getAlertDetailsFieldValue } from '../../../../common/lib/endpoint/utils/get_event_details_field_values';

export interface UseBasicDataFromDetailsDataResult {
  agentId: string;
  alertId: string;
  alertUrl: string;
  data: TimelineEventsDetailsItem[] | null;
  hostName: string;
  indexName: string;
  isAlert: boolean;
  ruleDescription: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  userName: string;
}

export const useBasicDataFromDetailsData = (
  data: TimelineEventsDetailsItem[] | null
): UseBasicDataFromDetailsDataResult => {
  const agentId = useMemo(
    () => getAlertDetailsFieldValue({ category: 'agent', field: 'agent.id' }, data),
    [data]
  );

  const alertId = useMemo(
    () => getAlertDetailsFieldValue({ category: '_id', field: '_id' }, data),
    [data]
  );

  const alertUrl = useMemo(
    () => getAlertDetailsFieldValue({ category: 'kibana', field: 'kibana.alert.url' }, data),
    [data]
  );

  const hostName = useMemo(
    () => getAlertDetailsFieldValue({ category: 'host', field: 'host.name' }, data),
    [data]
  );

  const indexName = useMemo(
    () => getAlertDetailsFieldValue({ category: '_index', field: '_index' }, data),
    [data]
  );

  const isAlert = some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, data);

  const ruleDescription = useMemo(
    () =>
      getAlertDetailsFieldValue(
        { category: 'kibana', field: 'kibana.alert.rule.description' },
        data
      ),
    [data]
  );

  const ruleId = useMemo(
    () =>
      isAlert
        ? getAlertDetailsFieldValue({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, data)
        : getAlertDetailsFieldValue({ category: 'signal', field: 'signal.rule.id' }, data),
    [isAlert, data]
  );

  const ruleName = useMemo(
    () => getAlertDetailsFieldValue({ category: 'kibana', field: 'kibana.alert.rule.name' }, data),
    [data]
  );

  const timestamp = useMemo(
    () => getAlertDetailsFieldValue({ category: 'base', field: '@timestamp' }, data),
    [data]
  );

  const userName = useMemo(
    () => getAlertDetailsFieldValue({ category: 'user', field: 'user.name' }, data),
    [data]
  );

  return useMemo(
    () => ({
      agentId,
      alertId,
      alertUrl,
      data,
      hostName,
      indexName,
      isAlert,
      ruleDescription,
      ruleId,
      ruleName,
      timestamp,
      userName,
    }),
    [
      agentId,
      alertId,
      alertUrl,
      data,
      hostName,
      indexName,
      isAlert,
      ruleDescription,
      ruleId,
      ruleName,
      timestamp,
      userName,
    ]
  );
};
