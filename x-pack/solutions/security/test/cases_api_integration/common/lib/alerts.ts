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
  routeWithNamespace,
} from '@kbn/detections-response-ftr-services';

/**
 * Runs a detection rule in `spaceId` (the default space when omitted), so the alerts it creates
 * carry that space in `kibana.space_ids` and can only be attached to cases of that space.
 */
export const createSecuritySolutionAlerts = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  numberOfSignals: number = 1,
  spaceId?: string
): Promise<estypes.SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const rule = {
    ...getRuleForAlertTesting(['auditbeat-*']),
    query: 'process.executable: "/usr/bin/sudo"',
  };
  const { id } = await createRule(supertest, log, rule, spaceId);
  await waitForRuleSuccess({ supertest, log, id, namespace: spaceId });
  await waitForAlertsToBePresent(supertest, log, numberOfSignals, [id], spaceId);
  const signals = await getAlertsByIds(supertest, log, [id], undefined, spaceId);

  return signals;
};

export const getSecuritySolutionAlerts = async (
  supertest: SuperTest.Agent,
  alertIds: string[],
  spaceId?: string
): Promise<estypes.SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const { body: updatedAlert } = await supertest
    .post(routeWithNamespace(DETECTION_ENGINE_QUERY_SIGNALS_URL, spaceId))
    .set('kbn-xsrf', 'true')
    .send(getQueryAlertIds(alertIds))
    .expect(200);

  return updatedAlert;
};
