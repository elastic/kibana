/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ToolingLog } from '@kbn/tooling-log';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/detection_engine/schemas/alerts';
import { RiskEnrichmentFields } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/enrichments/types';
import {
  getRuleForSignalTesting,
  createRule,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getSignalsByIds,
  getQuerySignalIds,
} from '../../../detection_engine_api_integration/utils';
import { superUser } from './authentication/users';
import { User } from './authentication/types';
import { getSpaceUrlPrefix } from './api/helpers';

export const createSecuritySolutionAlerts = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<estypes.SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const rule = getRuleForSignalTesting(['auditbeat-*']);
  const { id } = await createRule(supertest, log, rule);
  await waitForRuleSuccessOrStatus(supertest, log, id);
  await waitForSignalsToBePresent(supertest, log, 1, [id]);
  const signals = await getSignalsByIds(supertest, log, [id]);

  return signals;
};

export const getSecuritySolutionAlerts = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  alertIds: string[]
): Promise<estypes.SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const { body: updatedAlert } = await supertest
    .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
    .set('kbn-xsrf', 'true')
    .send(getQuerySignalIds(alertIds))
    .expect(200);

  return updatedAlert;
};

interface AlertResponse {
  'kibana.alert.case_ids'?: string[];
}

export const getAlertById = async ({
  supertest,
  id,
  index,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  id: string;
  index: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<AlertResponse> => {
  const { body: alert } = await supertest
    .get(`${getSpaceUrlPrefix(auth?.space)}/internal/rac/alerts?id=${id}&index=${index}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .expect(expectedHttpCode);

  return alert;
};
