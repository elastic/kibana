/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { RiskEnrichmentFields } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/enrichments/types';
import {
  getRuleForAlertTesting,
  createRule,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  getAlertsByIds,
  getQueryAlertIds,
} from '@kbn/test-suites-xpack/common/utils/security_solution';

export const createSecuritySolutionAlerts = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  numberOfSignals: number = 1
): Promise<estypes.SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const rule = {
    ...getRuleForAlertTesting(['auditbeat-*']),
    query: 'process.executable: "/usr/bin/sudo"',
  };
  const { id } = await createRule(supertest, log, rule);
  await waitForRuleSuccess({ supertest, log, id });
  await waitForAlertsToBePresent(supertest, log, numberOfSignals, [id]);
  const signals = await getAlertsByIds(supertest, log, [id]);

  return signals;
};

export const getSecuritySolutionAlerts = async (
  supertest: SuperTest.Agent,
  alertIds: string[]
): Promise<estypes.SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const { body: updatedAlert } = await supertest
    .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
    .set('kbn-xsrf', 'true')
    .send(getQueryAlertIds(alertIds))
    .expect(200);

  return updatedAlert;
};
