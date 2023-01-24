/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';

/**
 * Helper to cut down on the noise in some of the tests. Does a delete of a rule.
 * It does not check for a 200 "ok" on this.
 * @param supertest The supertest deps
 * @param ruleId The rule id to delete
 * @param log The tooling logger
 */
export const deleteRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleId: string
): Promise<RuleResponse> => {
  const response = await supertest
    .delete(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
    .set('kbn-xsrf', 'true');
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when deleting the rule (deleteRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }

  return response.body;
};
