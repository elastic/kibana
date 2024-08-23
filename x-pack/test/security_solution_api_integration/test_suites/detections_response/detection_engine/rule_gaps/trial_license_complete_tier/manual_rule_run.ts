/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import moment from 'moment';
import { BackfillResponse } from '@kbn/alerting-plugin/common/routes/backfill/response';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getCustomQueryRuleParams, scheduleRuleRun } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  createRule,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';

const buildSchedule = (
  startDate: moment.Moment,
  endDate: moment.Moment,
  intervalInMinutes: number
) => {
  const schedule = [];
  const interval = `${intervalInMinutes}m`;
  let currentDate = startDate.clone();
  while (currentDate.isBefore(endDate)) {
    schedule.push({
      interval,
      run_at: currentDate.add(intervalInMinutes, 'm').toISOString(),
      status: 'pending',
    });
    currentDate = currentDate.clone();
  }
  return schedule;
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  // Currently FF are not supported on MKI environments, so this test should be skipped from MKI environments.
  // Once `manualRuleRunEnabled` FF is removed, we can remove `@skipInServerlessMKI` as well
  describe('@ess @serverless @skipInServerlessMKI manual_rule_run', () => {
    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('happy path', () => {
      it('should schedule rule run over valid time range', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const results = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate,
          endDate,
        });

        expect(results.length).toBe(1);
        expect((results[0] as BackfillResponse).start).toEqual(startDate.toISOString());
        expect((results[0] as BackfillResponse).schedule).toEqual(
          buildSchedule(startDate, endDate, intervalInMinutes)
        );
      });
    });

    describe('error handling', () => {
      it('should return bad request error when rule is disabled', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const results = await scheduleRuleRun(supertest, [createdRule.id], {
          startDate,
          endDate,
        });

        expect(results).toEqual([
          {
            error: {
              message: `Rule ${createdRule.id} is disabled`,
              rule: { id: `${createdRule.id}`, name: 'Custom query rule' },
            },
          },
        ]);
      });

      it('should return bad request error when rule ID does not exist', async () => {
        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const nonExistingRuleId = 'non-existing-rule-id';
        const results = await scheduleRuleRun(
          supertest,
          [nonExistingRuleId],
          {
            startDate,
            endDate,
          },
          400
        );

        expect(results).toEqual({
          error: 'Bad Request',
          message: `No rules matching ids ${nonExistingRuleId} found to schedule backfill`,
          statusCode: 400,
        });
      });

      it('should return bad request error when start date greater than end date', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            interval,
          })
        );

        const startDate = moment();
        const endDate = startDate.clone().subtract(1, 'h');

        const results = await scheduleRuleRun(
          supertest,
          [createdRule.id],
          {
            startDate,
            endDate,
          },
          400
        );

        expect(results).toEqual({
          error: 'Bad Request',
          message: '[request body.0]: Backfill end must be greater than backfill start',
          statusCode: 400,
        });
      });

      it('should return bad request error when start date is equal to end date', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            interval,
          })
        );

        const startDate = moment();
        const endDate = startDate.clone();

        const results = await scheduleRuleRun(
          supertest,
          [createdRule.id],
          {
            startDate,
            endDate,
          },
          400
        );

        expect(results).toEqual({
          error: 'Bad Request',
          message: '[request body.0]: Backfill end must be greater than backfill start',
          statusCode: 400,
        });
      });

      it('should return bad request error when some of the rules do not exist', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const nonExistingRuleId = 'non-existing-rule-id';
        const results = await scheduleRuleRun(supertest, [createdRule.id, nonExistingRuleId], {
          startDate,
          endDate,
        });

        expect(results).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule: expect.objectContaining({ id: `${createdRule.id}` }),
              schedule: buildSchedule(startDate, endDate, intervalInMinutes),
            }),
            {
              error: {
                message: `Saved object [alert/${nonExistingRuleId}] not found`,
                rule: { id: nonExistingRuleId },
              },
            },
          ])
        );
      });

      it('should return bad request error when some of the rules are disabled', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const results = await scheduleRuleRun(supertest, [createdRule1.id, createdRule2.id], {
          startDate,
          endDate,
        });

        expect(results).toEqual(
          expect.arrayContaining([
            {
              error: {
                message: `Rule ${createdRule1.id} is disabled`,
                rule: { id: `${createdRule1.id}`, name: 'Custom query rule' },
              },
            },
            expect.objectContaining({
              rule: expect.objectContaining({ id: `${createdRule2.id}` }),
              schedule: buildSchedule(startDate, endDate, intervalInMinutes),
            }),
          ])
        );
      });

      it('should return bad request error when start date is more than 90 days in the past', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(91, 'd');

        const results = await scheduleRuleRun(
          supertest,
          [createdRule.id],
          {
            startDate,
            endDate,
          },
          400
        );

        expect(results).toEqual({
          error: 'Bad Request',
          message: '[request body.0]: Backfill cannot look back more than 90 days',
          statusCode: 400,
        });
      });

      it('should return bad request error when end date is in future', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            interval,
          })
        );

        const endDate = moment().add(30, 'm');
        const startDate = endDate.clone().subtract(1, 'h');

        const results = await scheduleRuleRun(
          supertest,
          [createdRule.id],
          {
            startDate,
            endDate,
          },
          400
        );

        expect(results).toEqual({
          error: 'Bad Request',
          message: '[request body.0]: Backfill cannot be scheduled for the future',
          statusCode: 400,
        });
      });
    });
  });
};
