/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  RuleExecutionStatus,
  RuleExecutionStatusEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { refreshIndex } from '..';
import { getAlertsByIds, waitForRuleStatus } from '../../../../../common/utils/security_solution';

export const getOpenAlerts = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  es: Client,
  rule: RuleResponse,
  status: RuleExecutionStatus = RuleExecutionStatusEnum.succeeded,
  size?: number,
  afterDate?: Date
) => {
  await waitForRuleStatus(status, { supertest, log, id: rule.id, afterDate });
  // Critically important that we wait for rule success AND refresh the write index in that order before we
  // assert that no Alerts were created. Otherwise, Alerts could be written but not available to query yet
  // when we search, causing tests that check that Alerts are NOT created to pass when they should fail.
  await refreshIndex(es, '.alerts-security.alerts-default*');
  return getAlertsByIds(supertest, log, [rule.id], size);
};
