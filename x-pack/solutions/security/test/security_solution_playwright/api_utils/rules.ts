/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';

import type { APIRequestContext } from '@playwright/test';
import { getCommonHeadersWithApiVersion } from './headers';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of alerts.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation and testing by getting all the alerts at once.
 * @param ruleId The optional ruleId which is rule-1 by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getRuleForAlertTesting = (
  index: string[],
  ruleId = 'rule-1',
  enabled = true
): QueryRuleCreateProps => ({
  name: 'Alert Testing Query',
  description: 'Tests a simple query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index,
  type: 'query',
  query: '*:*',
  from: '1900-01-01T00:00:00.000Z',
});

const indexes = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
  '-*elastic-cloud-logs-*',
];

export const createRule = async (request: APIRequestContext) => {
  const data = getRuleForAlertTesting(indexes);
  const headers = await getCommonHeadersWithApiVersion();
  const response = await request.post(DETECTION_ENGINE_RULES_URL, {
    data,
    headers,
  });

  return await response.json();
};

export const deleteAllRules = async (request: APIRequestContext) => {
  const headers = await getCommonHeadersWithApiVersion();
  const response = await request.post(DETECTION_ENGINE_RULES_BULK_ACTION, {
    data: {
      query: '',
      action: 'delete',
    },
    headers,
  });

  return await response.json();
};
