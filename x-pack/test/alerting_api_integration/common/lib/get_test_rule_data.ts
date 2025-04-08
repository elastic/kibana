/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getTestRuleData(overwrites = {}) {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    rule_type_id: 'test.noop',
    consumer: 'alertsFixture',
    schedule: { interval: '1m' },
    throttle: '1m',
    notify_when: 'onThrottleInterval',
    actions: [],
    params: {},
    /* TODO: uncomment once artifacts is added to schema by https://github.com/elastic/kibana/pull/216292
    artifacts: {
      dashboards: [
        {
          id: 'dashboard-0'
        },
        {
          id: 'dashboard-1'
        }
      ],
      investigationGuide: 'investigation guide'
    },
    */
    ...overwrites,
  };
}
