/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';

/**
 * Helper to cut down on the noise in some of the tests. This gets
 * a particular rule.
 *
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const fetchRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  idOrRuleId: { id: string; ruleId?: never } | { id?: never; ruleId: string }
): Promise<RuleResponse> =>
  (
    await supertest
      .get(DETECTION_ENGINE_RULES_URL)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .query({ id: idOrRuleId.id, rule_id: idOrRuleId.ruleId })
      .expect(200)
  ).body;
