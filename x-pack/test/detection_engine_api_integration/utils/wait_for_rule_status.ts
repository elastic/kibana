/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { RuleExecutionStatus } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import { waitFor } from './wait_for';

interface WaitForRuleStatusBaseParams {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  afterDate?: Date;
}

interface WaitForRuleStatusWithId extends WaitForRuleStatusBaseParams {
  id: string;
  ruleId?: never;
}

interface WaitForRuleStatusWithRuleId extends WaitForRuleStatusBaseParams {
  ruleId: string;
  id?: never;
}

export type WaitForRuleStatusParams = WaitForRuleStatusWithId | WaitForRuleStatusWithRuleId;

/**
 * Waits for rule to settle in a provided status.
 * Depending on wether `id` or `ruleId` provided it may impact the behavior.
 * - `id` leads to fetching a rule via ES Get API (rulesClient.resolve -> SOClient.resolve -> ES Get API)
 * - `ruleId` leads to fetching a rule via ES Search API (rulesClient.find -> SOClient.find -> ES Search API)
 * ES Search API may return outdated data while ES Get API always returns fresh data
 */
export const waitForRuleStatus = async (
  expectedStatus: RuleExecutionStatus,
  { supertest, log, afterDate, ...idOrRuleId }: WaitForRuleStatusParams
): Promise<void> => {
  await waitFor(
    async () => {
      const query = 'id' in idOrRuleId ? { id: idOrRuleId.id } : { rule_id: idOrRuleId.ruleId };
      const response = await supertest
        .get(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .query(query)
        .expect(200);

      // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
      const rule = response.body;
      const ruleStatus = rule?.execution_summary?.last_execution.status;
      const ruleStatusDate = rule?.execution_summary?.last_execution.date;

      return (
        rule != null &&
        ruleStatus === expectedStatus &&
        (afterDate ? new Date(ruleStatusDate) > afterDate : true)
      );
    },
    'waitForRuleStatus',
    log
  );
};

export const waitForRuleSuccess = (params: WaitForRuleStatusParams): Promise<void> =>
  waitForRuleStatus(RuleExecutionStatus.succeeded, params);

export const waitForRulePartialFailure = (params: WaitForRuleStatusParams): Promise<void> =>
  waitForRuleStatus(RuleExecutionStatus['partial failure'], params);

export const waitForRuleFailure = (params: WaitForRuleStatusParams): Promise<void> =>
  waitForRuleStatus(RuleExecutionStatus.failed, params);
