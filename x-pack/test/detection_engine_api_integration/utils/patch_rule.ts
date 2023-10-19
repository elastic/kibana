/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  RulePatchProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not do any retries.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const patchRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  patchedRule: RulePatchProps
): Promise<RuleResponse> => {
  const response = await supertest
    .patch(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send(patchedRule);
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when patching a rule (patchRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
