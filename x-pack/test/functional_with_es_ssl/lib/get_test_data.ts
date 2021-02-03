/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    alertTypeId: 'test.noop',
    consumer: 'alerts',
    schedule: { interval: '1m' },
    throttle: '1m',
    notifyWhen: 'onThrottleInterval',
    actions: [],
    params: {},
    ...overwrites,
  };
}

export function getTestActionData(overwrites = {}) {
  return {
    name: `slack-${Date.now()}`,
    actionTypeId: '.slack',
    config: {},
    secrets: {
      webhookUrl: 'https://test',
    },
    ...overwrites,
  };
}
