/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getTestAlertData(overwrites = {}) {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    alertTypeId: 'test.noop',
    schedule: { interval: '1m' },
    throttle: '1m',
    actions: [],
    params: {},
    ...overwrites,
  };
}
