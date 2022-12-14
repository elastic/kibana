/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getTestRuleData() {
  return {
    name: 'abc',
    rule_type_id: '.index-threshold',
    consumer: 'alerts',
    schedule: { interval: '1m' },
    throttle: '1m',
    notify_when: 'onThrottleInterval',
    params: {},
  };
}
