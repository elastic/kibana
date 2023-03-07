/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { RuleExecutionStatus } from '@kbn/security-solution-plugin/common/detection_engine/rule_monitoring';
import { waitFor } from './wait_for';

interface WaitForRuleStatusBaseParams {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  afterDate?: Date;
}

interface WaitForRuleStatusWithId extends WaitForRuleStatusBaseParams {
  id: string;
}

interface WaitForRuleStatusWithRuleId extends WaitForRuleStatusBaseParams {
  ruleId: string;
}

export type WaitForRuleStatusParams = WaitForRuleStatusWithId | WaitForRuleStatusWithRuleId;

/**
 * Waits for rule to settle in a provided status.
 * Depending on wether `id` or `ruleId` provided it may impact the following test logic.
 * If `id` is provided it leads to a chain rulesClient.resolve -> SOClient.resolve -> ES Get API
 * If `ruleId` is provided it leads to a chain rulesClient.find -> SOClient.find -> ES Search API
 * ES Search API may return outdated data while ES Get API always returns fresh data. This way if `id` is provided
 * it doesn't guarantee `execution_summary` is presented in rule objects fetched via `rulesClient.find` after
 * a promise returned by this function returns.
 */
export const waitForRuleStatus = async (
  status: RuleExecutionStatus,
  { supertest, log, afterDate, ...idOrRuleId }: WaitForRuleStatusParams
): Promise<void> => {
  await waitFor(
    async () => {
      try {
        const query = 'id' in idOrRuleId ? { id: idOrRuleId.id } : { rule_id: idOrRuleId.ruleId };
        const response = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query(query);

        if (response.status !== 200) {
          log.debug(
            `Did not get an expected 200 "ok" when waiting for a rule success or status (waitForRuleStatus). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
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
            `Did not get an expected status of ${status} while waiting for a rule success or status for rule ${JSON.stringify(
              query
            )} (waitForRuleStatus). Will continue retrying until status is found. body: ${JSON.stringify(
              response.body
            )}, status: ${JSON.stringify(ruleStatus)}`
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
