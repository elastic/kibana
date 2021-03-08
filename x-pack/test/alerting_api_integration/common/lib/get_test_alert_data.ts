/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getTestAlertData(overwrites = {}) {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    alertTypeId: 'test.noop',
    consumer: 'alertsFixture',
    schedule: { interval: '1m' },
    throttle: '1m',
    notifyWhen: 'onThrottleInterval',
    actions: [],
    params: {},
    ...overwrites,
  };
}
