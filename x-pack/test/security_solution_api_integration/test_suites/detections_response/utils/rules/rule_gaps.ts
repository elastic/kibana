/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import moment from 'moment';
import { INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH } from '@kbn/alerting-plugin/common';
import { ScheduleBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/schedule';

export interface TimeRange {
  startDate: moment.Moment;
  endDate: moment.Moment;
}

export const scheduleRuleRun = async (
  supertest: SuperTest.Agent,
  ruleIds: string[],
  timeRange: TimeRange,
  expectedStatusCode = 200
): Promise<ScheduleBackfillResponseBody> => {
  const params = ruleIds.map((ruleId) => {
    return {
      rule_id: ruleId,
      start: timeRange.startDate.toISOString(),
      end: timeRange.endDate.toISOString(),
    };
  });
  const response = await supertest
    .post(INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'Kibana')
    .send(params)
    .expect(expectedStatusCode);
  return response.body;
};
