/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type { FullResponseSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';

import { waitForRuleSuccessOrStatus } from './wait_for_rule_success_or_status';
import { refreshIndex } from './refresh_index';
import { getSignalsByIds } from './get_signals_by_ids';

export const getOpenSignals = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  es: Client,
  rule: FullResponseSchema
) => {
  await waitForRuleSuccessOrStatus(supertest, log, rule.id);
  // Critically important that we wait for rule success AND refresh the write index in that order before we
  // assert that no signals were created. Otherwise, signals could be written but not available to query yet
  // when we search, causing tests that check that signals are NOT created to pass when they should fail.
  await refreshIndex(es, '.alerts-security.alerts-default*');
  return getSignalsByIds(supertest, log, [rule.id]);
};
