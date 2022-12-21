/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { deleteRule } from './delete_rule';

/**
 * Helper to cut down on the noise in some of the tests. If this detects
 * a conflict it will try to manually remove the rule before re-adding the rule one time and log
 * and error about the race condition.
 * rule a second attempt. It only re-tries adding the rule if it encounters a conflict once.
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param rule The rule to create
 */
export const createRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  rule: RuleCreateProps
): Promise<RuleResponse> => {
  const response = await supertest
    .post(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .send(rule);
  if (response.status === 409) {
    if (rule.rule_id != null) {
      log.debug(
        `Did not get an expected 200 "ok" when creating a rule (createRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
          response.body
        )}, status: ${JSON.stringify(response.status)}`
      );
      await deleteRule(supertest, log, rule.rule_id);
      const secondResponseTry = await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(rule);
      if (secondResponseTry.status !== 200) {
        throw new Error(
          `Unexpected non 200 ok when attempting to create a rule (second try): ${JSON.stringify(
            response.body
          )}`
        );
      } else {
        return secondResponseTry.body;
      }
    } else {
      throw new Error('When creating a rule found an unexpected conflict (404)');
    }
  } else if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to create a rule: ${JSON.stringify(response.status)}`
    );
  } else {
    return response.body;
  }
};
