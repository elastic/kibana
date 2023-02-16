/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction, RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { AsApiContract } from '@kbn/alerting-plugin/server/routes/lib';

export function getTestRuleData(overwrites = {}) {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    rule_type_id: 'test.noop',
    consumer: 'alertsFixture',
    schedule: { interval: '1m' },
    throttle: undefined,
    notify_when: undefined,
    actions: [],
    params: {},
    ...overwrites,
  };
}

export function getTestRuleActions(createdAction: AsApiContract<RuleAction>) {
  return [
    {
      id: createdAction.id,
      group: 'default',
      params: {},
      frequency: {
        summary: false,
        notify_when: RuleNotifyWhen.THROTTLE,
        throttle: '1m',
      },
    },
  ] as AsApiContract<RuleAction>[];
}
