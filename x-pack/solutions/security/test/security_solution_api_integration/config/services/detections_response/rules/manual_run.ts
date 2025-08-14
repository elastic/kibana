/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { ScheduleBackfillResponse } from '@kbn/alerting-plugin/common/routes/backfill/apis/schedule';
import { routeWithNamespace } from '../route_with_namespace';

const BACKFILL_RULE_URL = `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill`;
const BACKFILL_RULE_URL_SCHEDULE = `${BACKFILL_RULE_URL}/_schedule`;

export const manualRuleRun = async ({
  supertest,
  ruleId,
  start,
  end,
  namespace,
}: {
  ruleId: string;
  start: string;
  end: string;
  namespace?: string;
  supertest: SuperTest.Agent;
}): Promise<ScheduleBackfillResponse> => {
  const route = routeWithNamespace(BACKFILL_RULE_URL_SCHEDULE, namespace);
  const response = await supertest
    .post(route)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'Kibana')
    .send([
      {
        rule_id: ruleId,
        start,
        end,
      },
    ]);

  return response;
};
