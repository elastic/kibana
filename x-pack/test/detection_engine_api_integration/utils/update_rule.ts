/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';

import { DETECTION_ENGINE_RULES_URL } from '../../../plugins/security_solution/common/constants';
import {
  UpdateRulesSchema,
  FullResponseSchema,
} from '../../../plugins/security_solution/common/detection_engine/schemas/request';

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not do any retries.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const updateRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  updatedRule: UpdateRulesSchema
): Promise<FullResponseSchema> => {
  const response = await supertest
    .put(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .send(updatedRule);
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when updating a rule (updateRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
