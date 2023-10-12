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
  RuleExecutionStatus,
  RuleExecutionStatusEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import { waitFor } from '../wait_for';
import { routeWithNamespace } from '../route_with_namespace';

interface WaitForRuleStatusBaseParams {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  afterDate?: Date;
  namespace?: string;
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
  { supertest, log, afterDate, namespace, ...idOrRuleId }: WaitForRuleStatusParams
): Promise<void> => {
  await waitFor(
    async () => {
      const query = 'id' in idOrRuleId ? { id: idOrRuleId.id } : { rule_id: idOrRuleId.ruleId };
      const route = routeWithNamespace(DETECTION_ENGINE_RULES_URL, namespace);
      const response = await supertest
        .get(route)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
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
  waitForRuleStatus(RuleExecutionStatusEnum.succeeded, params);

export const waitForRulePartialFailure = (params: WaitForRuleStatusParams): Promise<void> =>
  waitForRuleStatus(RuleExecutionStatusEnum['partial failure'], params);

export const waitForRuleFailure = (params: WaitForRuleStatusParams): Promise<void> =>
  waitForRuleStatus(RuleExecutionStatusEnum.failed, params);
