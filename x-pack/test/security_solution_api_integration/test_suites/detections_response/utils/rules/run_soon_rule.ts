/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

/**
 * Triggers a run for a rule using the `_run_soon` API.
 */
export const runSoonRule = async (supertest: SuperTest.Agent, ruleId: string): Promise<void> => {
  await supertest
    .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'kibana')
    .set('elastic-api-version', '2023-10-31');
};
