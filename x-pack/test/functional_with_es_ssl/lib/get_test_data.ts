/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

export function generateUniqueKey() {
  return uuid.v4().replace(/-/g, '');
}

export function getTestAlertData(overwrites = {}) {
  return {
    enabled: true,
    name: generateUniqueKey(),
    tags: ['foo', 'bar'],
    rule_type_id: 'test.noop',
    consumer: 'alerts',
    schedule: { interval: '1m' },
    throttle: '1m',
    notify_when: 'onThrottleInterval',
    actions: [],
    params: {},
    ...overwrites,
  };
}

export function getTestActionData(overwrites = {}) {
  return {
    name: `slack-${Date.now()}`,
    connector_type_id: '.slack',
    config: {},
    secrets: {
      webhookUrl: 'https://test',
    },
    ...overwrites,
  };
}
