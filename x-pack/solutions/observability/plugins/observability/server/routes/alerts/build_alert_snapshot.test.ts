/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertSnapshot } from './build_alert_snapshot';

const alert = {
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test rule',
  'kibana.alert.rule.rule_type_id': 'test.rule',
  'kibana.alert.rule.category': 'Test category',
  'kibana.alert.reason': 'Threshold exceeded',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-09-02T10:00:00.000Z',
  'kibana.alert.flapping': false,
  'kibana.alert.group': [{ field: 'host.name', value: 'host-1' }],
};

it('builds a validated alert snapshot', () => {
  expect(buildAlertSnapshot(alert)).toEqual({
    id: 'alert-1',
    rule_id: 'rule-1',
    rule_name: 'Test rule',
    rule_type_id: 'test.rule',
    rule_category: 'Test category',
    reason: 'Threshold exceeded',
    status: 'active',
    start: '2026-09-02T10:00:00.000Z',
    flapping: false,
    group: [{ field: 'host.name', value: 'host-1' }],
  });
});

it('rejects missing required fields and malformed groups', () => {
  expect(buildAlertSnapshot({ ...alert, 'kibana.alert.uuid': undefined })).toBeUndefined();
  expect(
    buildAlertSnapshot({
      ...alert,
      'kibana.alert.group': [{ field: 'host.name', value: 42 }],
    })
  ).toBeUndefined();
});
