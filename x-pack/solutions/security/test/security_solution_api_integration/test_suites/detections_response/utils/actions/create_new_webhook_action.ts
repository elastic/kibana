/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { RuleAction } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type SuperTest from 'supertest';

import { getWebHookAction } from './get_web_hook_action';

/**
 * Helper to cut down on the noise in some of the tests. This
 * creates a new action and expects a 200 and does not do any retries.
 *
 * @param supertest The supertest deps
 */
export const createWebHookRuleAction = async (supertest: SuperTest.Agent): Promise<RuleAction> => {
  return (
    await supertest
      .post('/api/actions/action')
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'foo')
      .send(getWebHookAction())
      .expect(200)
  ).body;
};
