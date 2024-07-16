/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

const SIMPLE_APM_RULE_DATA = {
  name: 'Test rule',
  rule_type_id: 'apm.anomaly',
  enabled: false,
  consumer: 'alerts',
  tags: [],
  actions: [],
  params: {
    windowSize: 30,
    windowUnit: 'm',
    anomalySeverityType: 'critical',
    anomalyDetectorTypes: ['txLatency'],
    environment: 'ENVIRONMENT_ALL',
  },
  schedule: {
    interval: '10m',
  },
};

/**
 * Created a non security rule. Helpful in tests to verify functionality works with presence of non security rules.
 * @param supertest The supertest deps
 */
export async function createNonSecurityRule(supertest: SuperTest.Agent): Promise<void> {
  await supertest
    .post('/api/alerting/rule')
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send(SIMPLE_APM_RULE_DATA)
    .expect(200);
}
