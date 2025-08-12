/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  RuleUpdateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not do any retries.
 *
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const updateRule = async (
  supertest: SuperTest.Agent,
  updatedRule: RuleUpdateProps
): Promise<RuleResponse> =>
  (
    await supertest
      .put(DETECTION_ENGINE_RULES_URL)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .send(updatedRule)
      .expect(200)
  ).body;
