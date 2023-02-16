/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction, RuleNotifyWhen, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { AsApiContract } from '@kbn/alerting-plugin/server/routes/lib';
import { SanitizedRule } from '@kbn/triggers-actions-ui-plugin/public/types';

export const getExpectedRule = ({
  responseBody,
  username = null,
  overrides = {},
}: {
  responseBody: AsApiContract<SanitizedRule<RuleTypeParams>>;
  username?: string | null;
  overrides?: Partial<AsApiContract<SanitizedRule<RuleTypeParams>>>;
}) => ({
  id: responseBody.id,
  name: 'abc',
  tags: ['foo'],
  actions: [],
  enabled: true,
  rule_type_id: 'test.noop',
  running: false,
  consumer: 'alertsFixture',
  params: {},
  created_by: username,
  schedule: { interval: '1m' },
  scheduled_task_id: responseBody.scheduled_task_id,
  created_at: responseBody.created_at,
  updated_at: responseBody.updated_at,
  throttle: '1m',
  notify_when: RuleNotifyWhen.THROTTLE,
  updated_by: username,
  api_key_owner: username,
  mute_all: false,
  muted_alert_ids: [],
  execution_status: responseBody.execution_status,
  ...(responseBody.next_run ? { next_run: responseBody.next_run } : {}),
  ...(responseBody.last_run ? { last_run: responseBody.last_run } : {}),
  ...overrides,
});

export const getExpectedActions = (createdAction: AsApiContract<RuleAction>) =>
  [
    {
      id: createdAction.id,
      connector_type_id: createdAction.connector_type_id,
      group: 'default',
      params: {},
      frequency: {
        summary: false,
        notify_when: RuleNotifyWhen.THROTTLE,
        throttle: '1m',
      },
    },
  ] as Array<AsApiContract<RuleAction>>;
