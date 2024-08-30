/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { chunk } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import moment from 'moment';
import {
  INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
  INTERNAL_ALERTING_BACKFILL_API_PATH,
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
} from '@kbn/alerting-plugin/common';
import type { ScheduleBackfillResponseBody } from '@kbn/alerting-plugin/server/routes/schemas/backfill/apis/schedule';
import type { FindBackfillResponse } from '@kbn/alerting-plugin/server/routes/schemas/backfill/apis/find';
import { waitFor } from '../../../../../common/utils/security_solution';
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

const findBackfillsRequest = async ({
  supertest,
  query,
  expectedStatusCode = 200,
}: {
  supertest: SuperTest.Agent;
  query: Record<string, string | number>;
  expectedStatusCode?: number;
}): Promise<FindBackfillResponse['body']> => {
  const response: FindBackfillResponse = await supertest
    .post(INTERNAL_ALERTING_BACKFILL_FIND_API_PATH)
    .query(query)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'Kibana')
    .send({})
    .expect(expectedStatusCode);

  return response.body;
};

export const findAllBackfills = async (supertest: SuperTest.Agent, expectedStatusCode = 200) => {
  let total = 0;
  let page = 1;
  const perPage = 100;
  let backfills: FindBackfillResponse['body']['data'] = [];
  // ?page=1&per_page=100&sort_field=createdAt&sort_order=desc
  while (backfills.length < total || total === 0) {
    const response = await findBackfillsRequest({
      supertest,
      query: { page, per_page: perPage, sort_field: 'createdAt', sort_order: 'asc' },
    });

    total = response.total;
    backfills = backfills.concat(...response.data);
    page++;
    if (total === 0 || response.data.length < perPage) {
      break;
    }
  }

  return backfills;
};

export const stopBackfill = async (
  supertest: SuperTest.Agent,
  ruleId: string
): Promise<ScheduleBackfillResponseBody> => {
  const response = await supertest
    .delete(`${INTERNAL_ALERTING_BACKFILL_API_PATH}/${ruleId}`)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'Kibana')
    .expect([200, 204]);
  return response.body;
};

export const stopAllManualRuns = async (supertest: SuperTest.Agent) => {
  const backfills = await findAllBackfills(supertest);
  const CHUNK_SIZE = 3;
  const backfillChunks = chunk(backfills, CHUNK_SIZE);

  for (const backfillChunk of backfillChunks) {
    await Promise.all(backfillChunk.map((backfill) => stopBackfill(supertest, backfill.id)));
  }
};

export const waitForBackfillExecuted = async (
  backfills: ScheduleBackfillResponseBody,
  ruleIds: string[],
  {
    supertest,
    log,
  }: {
    supertest: SuperTest.Agent;
    log: ToolingLog;
  }
): Promise<void> => {
  await waitFor(
    async () => {
      const { data: backfillsByRules } = await findBackfillsRequest({
        supertest,
        query: {
          page: 1,
          per_page: ruleIds.length,
          sort_field: 'createdAt',
          sort_order: 'asc',
          rule_ids: ruleIds.join(','),
        },
      });

      if (!backfillsByRules?.length) {
        return true;
      }

      const isAllBackfillsExecuted = backfills.every((backfill) => {
        if (!('id' in backfill)) {
          return true;
        }
        return !backfillsByRules?.some((backfillByRule) => backfillByRule.id === backfill?.id);
      });

      return isAllBackfillsExecuted;
    },
    'waitForBackfillExecuted',
    log
  );
};
