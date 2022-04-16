/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';

import { RuleExecutionStatus } from '@kbn/security-solution-plugin/common/detection_engine/schemas/common';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { waitFor } from './wait_for';

/**
 * Waits for the rule in find status to be 'succeeded'
 * or the provided status, before continuing
 * @param supertest Deps
 */
export const waitForRuleSuccessOrStatus = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string,
  status: RuleExecutionStatus = RuleExecutionStatus.succeeded,
  afterDate?: Date
): Promise<void> => {
  await waitFor(
    async () => {
      try {
        const response = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id });
        if (response.status !== 200) {
          log.debug(
            `Did not get an expected 200 "ok" when waiting for a rule success or status (waitForRuleSuccessOrStatus). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
              response.body
            )}, status: ${JSON.stringify(response.status)}`
          );
        }

        // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
        const rule = response.body;
        const ruleStatus = rule?.execution_summary?.last_execution.status;
        const ruleStatusDate = rule?.execution_summary?.last_execution.date;

        if (ruleStatus !== status) {
          log.debug(
            `Did not get an expected status of ${status} while waiting for a rule success or status for rule id ${id} (waitForRuleSuccessOrStatus). Will continue retrying until status is found. body: ${JSON.stringify(
              response.body
            )}, status: ${JSON.stringify(response.status)}`
          );
        }
        return (
          rule != null &&
          ruleStatus === status &&
          (afterDate ? new Date(ruleStatusDate) > afterDate : true)
        );
      } catch (e) {
        if ((e as Error).message.includes('got 503 "Service Unavailable"')) {
          return false;
        }
        throw e;
      }
    },
    'waitForRuleSuccessOrStatus',
    log
  );
};
