/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { Rule } from '@kbn/alerting-plugin/common';
import {
  BaseRuleParams,
  InternalRuleCreate,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';

/**
 * Creates a rule using the alerting APIs directly.
 * This allows us to test some legacy types that are not exposed
 * on our APIs
 *
 * @param supertest
 */
export const createRuleThroughAlertingEndpoint = async (
  supertest: SuperTest.Agent,
  rule: InternalRuleCreate
): Promise<Rule<BaseRuleParams>> => {
  const { body } = await supertest
    .post('/api/alerting/rule')
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send(rule)
    .expect(200);

  return body;
};
