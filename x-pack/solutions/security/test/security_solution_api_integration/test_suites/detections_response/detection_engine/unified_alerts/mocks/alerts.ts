/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

export const expectedDetectionAlerts = [
  expect.objectContaining({
    _id: 'eabbdefc23da981f2b74ab58b82622a97bb9878caa11bc914e2adfacc94780f1',
    _source: expect.objectContaining({
      'kibana.alert.rule.name': 'Endpoint Security',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    }),
  }),
  expect.objectContaining({
    _id: '170865e675eda76202f0095b23869d8d0726df4c91a343876df38b566bf1e57d',
    _source: expect.objectContaining({
      'kibana.alert.rule.name': 'Endpoint Security',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    }),
  }),
  expect.objectContaining({
    _id: 'f3bbdf17847c703e37dca942dc6c1db69eb8af18a74c1f52b6d0bd76c6b3b135',
    _source: expect.objectContaining({
      'kibana.alert.rule.name': 'Endpoint Security',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    }),
  }),
];

export const expectedAttackAlerts = [
  expect.objectContaining({
    _id: '40980216-cf98-4447-af57-894c0e7c39b4',
    _source: expect.objectContaining({
      'kibana.alert.rule.name': 'Insights_Testing',
      'kibana.alert.rule.rule_type_id': 'attack-discovery',
      'kibana.alert.attack_discovery.title': 'Emotet to Sodinokibi ransomware chain',
    }),
  }),
  expect.objectContaining({
    _id: '8ff09eb6-aa01-41dc-882e-d7115c3016e3',
    _source: expect.objectContaining({
      'kibana.alert.rule.name': 'Insights_Testing',
      'kibana.alert.rule.rule_type_id': 'attack-discovery',
      'kibana.alert.attack_discovery.title': 'Office to certutil to custom loader',
    }),
  }),
  expect.objectContaining({
    _id: 'c50c57de-8d20-465d-a5d6-9fc269d33e37',
    _source: expect.objectContaining({
      'kibana.alert.rule.name': 'Insights_Testing',
      'kibana.alert.rule.rule_type_id': 'attack-discovery',
      'kibana.alert.attack_discovery.title': 'OneNote phishing to C2 loader',
    }),
  }),
];
