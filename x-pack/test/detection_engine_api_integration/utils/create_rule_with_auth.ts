/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

/**
 * Helper to cut down on the noise in some of the tests.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const createRuleWithAuth = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  rule: RuleCreateProps,
  auth: { user: string; pass: string }
): Promise<RuleResponse> => {
  const { body } = await supertest
    .post(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .auth(auth.user, auth.pass)
    .send(rule);
  return body;
};
