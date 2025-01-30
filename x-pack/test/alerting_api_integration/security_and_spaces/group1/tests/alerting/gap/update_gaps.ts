/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server/saved_objects';
import { SuperuserAtSpace1 } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover, getTestRuleData } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib/get_event_log';

// eslint-disable-next-line import/no-default-export
export default function updateGapsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('update gaps', () => {
    const objectRemover = new ObjectRemover(supertest);
    const gapStart = moment().subtract(14, 'days').startOf('day').toISOString();
    const gapEnd = moment().subtract(13, 'days').startOf('day').toISOString();

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    function getRule(overwrites = {}) {
      return getTestRuleData({
        rule_type_id: 'test.patternFiringAutoRecoverFalse',
        params: {
          pattern: {
            instance: [true, false, true],
          },
        },
        schedule: { interval: '12h' },
        ...overwrites,
      });
    }

    async function waitForBackfillComplete(backfillId: string, spaceId: string) {
      await retry.try(async () => {
        const response = await supertest
          .get(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/${backfillId}`)
          .set('kbn-xsrf', 'foo');

        expect(response.statusCode).to.eql(404);
      });
    }

    it('should update gap status after backfill execution', async () => {
      const { space } = SuperuserAtSpace1;

      // Create a rule
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getRule())
        .expect(200);
      const ruleId = ruleResponse.body.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      // Report a gap
      await supertest
        .post(`${getUrlPrefix(space.id)}/_test/report_gap`)
        .set('kbn-xsrf', 'foo')
        .send({
          ruleId,
          start: gapStart,
          end: gapEnd,
          spaceId: space.id,
        });

      // Verify gap exists and is unfilled
      const initialGapResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          rule_id: ruleId,
          start: gapStart,
          end: gapEnd,
        });

      expect(initialGapResponse.statusCode).to.eql(200);
      expect(initialGapResponse.body.total).to.eql(1);
      const initialGap = initialGapResponse.body.data[0];
      expect(initialGap.status).to.eql('unfilled');
      expect(initialGap.unfilled_duration_ms).to.eql(86400000);
      expect(initialGap.unfilled_intervals).to.have.length(1);
      expect(initialGap.unfilled_intervals[0].gte).to.eql(gapStart);
      expect(initialGap.unfilled_intervals[0].lte).to.eql(gapEnd);
      expect(initialGap.filled_intervals).to.have.length(0);
      expect(initialGap.in_progress_intervals).to.have.length(0);

      // Schedule backfill for the gap period
      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send([{ rule_id: ruleId, start: gapStart, end: gapEnd }]);

      expect(scheduleResponse.statusCode).to.eql(200);
      const backfillId = scheduleResponse.body[0].id;

      // Wait for backfill to complete and verify all executions
      await waitForBackfillComplete(backfillId, space.id);

      await retry.try(async () => {
        // Verify gap is now filled
        const finalGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(finalGapResponse.statusCode).to.eql(200);
        expect(finalGapResponse.body.total).to.eql(1);
        const finalGap = finalGapResponse.body.data[0];
        expect(finalGap.status).to.eql('filled');
        expect(finalGap.filled_duration_ms).to.eql(86400000);
        expect(finalGap.unfilled_duration_ms).to.eql(0);
        expect(finalGap.filled_intervals).to.have.length(1);
        expect(finalGap.filled_intervals[0].gte).to.eql(gapStart);
        expect(finalGap.filled_intervals[0].lte).to.eql(gapEnd);
        expect(finalGap.unfilled_intervals).to.have.length(0);
        expect(finalGap.in_progress_intervals).to.have.length(0);
      });
    });

    it('should mark intervals as in_progress immediately after scheduling backfill', async () => {
      const { space } = SuperuserAtSpace1;

      // Create a rule with timeout pattern to ensure it stays in progress
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getRule({
            params: {
              pattern: {
                instance: ['timeout'],
              },
            },
          })
        )
        .expect(200);
      const ruleId = ruleResponse.body.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      // Report a gap
      await supertest
        .post(`${getUrlPrefix(space.id)}/_test/report_gap`)
        .set('kbn-xsrf', 'foo')
        .send({
          ruleId,
          start: gapStart,
          end: gapEnd,
          spaceId: space.id,
        });

      // Schedule backfill
      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send([{ rule_id: ruleId, start: gapStart, end: gapEnd }]);

      expect(scheduleResponse.statusCode).to.eql(200);

      // Verify intervals are marked as in_progress immediately
      await retry.try(async () => {
        const inProgressResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(inProgressResponse.statusCode).to.eql(200);
        expect(inProgressResponse.body.total).to.eql(1);
        const gap = inProgressResponse.body.data[0];
        expect(gap.status).to.eql('unfilled');
        expect(gap.in_progress_intervals).to.have.length(1);
        expect(gap.in_progress_intervals[0].gte).to.eql(gapStart);
        expect(gap.in_progress_intervals[0].lte).to.eql(gapEnd);
      });

      // Wait for timeout event
      await retry.try(async () => {
        const events = await getEventLog({
          getService,
          spaceId: space.id,
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id: scheduleResponse.body[0].id,
          provider: 'alerting',
          actions: new Map([['execute-timeout', { equal: 1 }]]),
        });
        expect(events.length).to.eql(1);
      });

      await waitForBackfillComplete(scheduleResponse.body[0].id, space.id);

      await retry.try(async () => {
        // Verify in-progress intervals are removed after timeout
        const finalGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(finalGapResponse.statusCode).to.eql(200);
        expect(finalGapResponse.body.total).to.eql(1);
        const finalGap = finalGapResponse.body.data[0];
        expect(finalGap.in_progress_intervals).to.have.length(0);
        expect(finalGap.status).to.eql('unfilled');
        expect(finalGap.unfilled_intervals).to.have.length(1);
        expect(finalGap.unfilled_intervals[0].gte).to.eql(gapStart);
        expect(finalGap.unfilled_intervals[0].lte).to.eql(gapEnd);
        expect(finalGap.filled_intervals).to.have.length(0);
      });
    });

    it('should handle partial gap filling when backfill overlaps', async () => {
      const { space } = SuperuserAtSpace1;

      // Create a rule
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getRule())
        .expect(200);
      const ruleId = ruleResponse.body.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      // Report a gap
      await supertest
        .post(`${getUrlPrefix(space.id)}/_test/report_gap`)
        .set('kbn-xsrf', 'foo')
        .send({
          ruleId,
          start: gapStart,
          end: gapEnd,
          spaceId: space.id,
        });

      // Schedule backfill for only part of the gap
      const partialStart = moment(gapStart).add(12, 'hours').toISOString();
      const partialEnd = moment(gapEnd).add(6, 'hours').toISOString();

      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send([{ rule_id: ruleId, start: partialStart, end: partialEnd }]);

      expect(scheduleResponse.statusCode).to.eql(200);
      const backfillId = scheduleResponse.body[0].id;

      // Wait for backfill to complete
      await waitForBackfillComplete(backfillId, space.id);

      await retry.try(async () => {
        // Verify gap is partially filled
        const finalGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(finalGapResponse.statusCode).to.eql(200);
        expect(finalGapResponse.body.total).to.eql(1);
        const gap = finalGapResponse.body.data[0];
        expect(gap.status).to.eql('partially_filled');
        expect(gap.filled_duration_ms).to.eql(12 * 60 * 60 * 1000);
        expect(gap.filled_intervals[0].gte).to.eql(partialStart);
        expect(gap.filled_intervals[0].lte).to.eql(gapEnd);
        expect(gap.unfilled_intervals[0].gte).to.eql(gapStart);
        expect(gap.unfilled_intervals[0].lte).to.eql(partialStart);
        expect(gap.unfilled_duration_ms).to.be.eql(12 * 60 * 60 * 1000);
        expect(gap.unfilled_intervals).to.have.length(1);
        expect(gap.filled_intervals).to.have.length(1);
        expect(gap.in_progress_intervals).to.have.length(0);
      });
    });

    it('should fill gap with multiple backfills', async () => {
      const { space } = SuperuserAtSpace1;

      const fiveDaysGapStart = moment(gapStart);
      const fiveDaysGapEnd = moment(gapStart).add(5, 'days').toISOString();

      // Create a rule
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getRule())
        .expect(200);
      const ruleId = ruleResponse.body.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      // Report a gap
      await supertest
        .post(`${getUrlPrefix(space.id)}/_test/report_gap`)
        .set('kbn-xsrf', 'foo')
        .send({
          ruleId,
          start: fiveDaysGapStart,
          end: fiveDaysGapEnd,
          spaceId: space.id,
        });

      // Schedule two backfills that together cover the entire gap

      const startBackfillTime = moment(gapStart);
      const backfills = [];

      for (let i = 0; i < 5; i++) {
        backfills.push({
          rule_id: ruleId,
          start: startBackfillTime.toISOString(),
          end: moment(startBackfillTime).add(24, 'hours').toISOString(),
        });
        startBackfillTime.add(24, 'hours');
      }

      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send(backfills);

      expect(scheduleResponse.statusCode).to.eql(200);
      expect(scheduleResponse.body).to.have.length(5);

      // Wait for both backfills to complete
      await Promise.all(
        scheduleResponse.body.map((result: { id: string }) =>
          waitForBackfillComplete(result.id, space.id)
        )
      );

      await retry.try(async () => {
        // Verify gap is completely filled
        const finalGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: fiveDaysGapStart.toISOString(),
            end: fiveDaysGapEnd,
          });

        expect(finalGapResponse.statusCode).to.eql(200);
        expect(finalGapResponse.body.total).to.eql(1);
        const finalGap = finalGapResponse.body.data[0];
        expect(finalGap.status).to.eql('filled');
        expect(finalGap.filled_duration_ms).to.eql(432000000);
        expect(finalGap.unfilled_duration_ms).to.eql(0);
        expect(finalGap.filled_intervals).to.have.length(1);
        expect(finalGap.filled_intervals[0].gte).to.eql(fiveDaysGapStart.toISOString());
        expect(finalGap.filled_intervals[0].lte).to.eql(fiveDaysGapEnd);
        expect(finalGap.unfilled_intervals).to.have.length(0);
        expect(finalGap.in_progress_intervals).to.have.length(0);
      });
    });

    it('should update gap status after backfill is deleted', async () => {
      const { space } = SuperuserAtSpace1;

      // Create a rule with timeout pattern to ensure we can catch it in progress
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getRule({
            params: {
              pattern: {
                instance: ['timeout'],
              },
            },
          })
        )
        .expect(200);
      const ruleId = ruleResponse.body.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      // Report a gap
      await supertest
        .post(`${getUrlPrefix(space.id)}/_test/report_gap`)
        .set('kbn-xsrf', 'foo')
        .send({
          ruleId,
          start: gapStart,
          end: gapEnd,
          spaceId: space.id,
        });

      // Schedule backfill
      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send([{ rule_id: ruleId, start: gapStart, end: gapEnd }]);

      expect(scheduleResponse.statusCode).to.eql(200);
      const backfillId = scheduleResponse.body[0].id;

      // Wait for in-progress state
      await retry.try(async () => {
        const inProgressResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(inProgressResponse.statusCode).to.eql(200);
        expect(inProgressResponse.body.data[0].status).to.eql('unfilled');
        expect(inProgressResponse.body.data[0].in_progress_intervals).to.have.length(1);
      });

      // Delete backfill while in progress
      await supertest
        .delete(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/${backfillId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await retry.try(async () => {
        // Verify gap status is updated
        const finalGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(finalGapResponse.statusCode).to.eql(200);
        expect(finalGapResponse.body.total).to.eql(1);
        const gap = finalGapResponse.body.data[0];
        expect(gap.status).to.eql('unfilled');
        expect(gap.in_progress_intervals).to.have.length(0);
        expect(gap.unfilled_intervals).to.have.length(1);
        expect(gap.unfilled_intervals[0].gte).to.eql(gapStart);
        expect(gap.unfilled_intervals[0].lte).to.eql(gapEnd);
        expect(gap.filled_intervals).to.have.length(0);
      });
    });

    it('should handle task failures', async () => {
      const { space } = SuperuserAtSpace1;

      // Create a rule that always errors
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getRule({
            params: {
              pattern: {
                instance: ['error'],
              },
            },
          })
        )
        .expect(200);
      const ruleId = ruleResponse.body.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      // Report a gap
      await supertest
        .post(`${getUrlPrefix(space.id)}/_test/report_gap`)
        .set('kbn-xsrf', 'foo')
        .send({
          ruleId,
          start: gapStart,
          end: gapEnd,
          spaceId: space.id,
        });

      // Schedule backfill
      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send([{ rule_id: ruleId, start: gapStart, end: gapEnd }]);

      expect(scheduleResponse.statusCode).to.eql(200);

      await retry.try(async () => {
        const firstGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        const firstGap = firstGapResponse.body.data[0];
        expect(firstGap.status).to.eql('unfilled');
        expect(firstGap.unfilled_intervals).to.have.length(0);
        expect(firstGap.in_progress_intervals).to.have.length(1);
        expect(firstGap.in_progress_intervals[0].gte).to.eql(gapStart);
        expect(firstGap.in_progress_intervals[0].lte).to.eql(gapEnd);
        expect(firstGap.filled_intervals).to.have.length(0);
      });

      const backfillId = scheduleResponse.body[0].id;

      // Wait for task failure event
      await retry.try(async () => {
        const events = await getEventLog({
          getService,
          spaceId: space.id,
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id: backfillId,
          provider: 'alerting',
          actions: new Map([['execute-backfill', { equal: 1 }]]),
        });
        expect(events.length).to.eql(1);
        expect(events[0]?.event?.outcome).to.eql('failure');
        expect(events[0]?.error?.message).to.eql('rule executor error');
      });

      await waitForBackfillComplete(backfillId, space.id);

      await retry.try(async () => {
        // Verify gap status is updated
        const finalGapResponse = await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/gaps/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            rule_id: ruleId,
            start: gapStart,
            end: gapEnd,
          });

        expect(finalGapResponse.statusCode).to.eql(200);
        expect(finalGapResponse.body.total).to.eql(1);
        const gap = finalGapResponse.body.data[0];
        expect(gap.status).to.eql('unfilled');
        expect(gap.in_progress_intervals).to.have.length(0);
        expect(gap.unfilled_intervals).to.have.length(1);
        expect(gap.unfilled_intervals[0].gte).to.eql(gapStart);
        expect(gap.unfilled_intervals[0].lte).to.eql(gapEnd);
        expect(gap.filled_intervals).to.have.length(0);
      });
    });
  });
}
