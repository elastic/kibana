/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import {
  createRule,
  deleteAllRules,
  getRuleForAlertTesting,
} from '@kbn/detections-response-ftr-services';
import {
  deleteAllEventLogExecutionEvents,
  indexEventLogExecutionEvents,
  getSpaceHealth,
} from '../../../utils';
import { makeExecutionEvents } from './template_data/execution_events';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');

  describe('@ess @serverless Get Space Health', () => {
    before(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    it('returns health stats for the space', async () => {
      const now = moment().utc();
      const timestamp = now.clone().subtract(30, 'minutes').toISOString();

      const rule1 = await createRule(
        supertest,
        log,
        getRuleForAlertTesting(['test-index'], uuidv4(), false)
      );
      const rule2 = await createRule(
        supertest,
        log,
        getRuleForAlertTesting(['test-index'], uuidv4(), false)
      );

      const events = [
        ...makeExecutionEvents({
          ruleId: rule1.id,
          ruleName: 'Alert Testing Query',
          timestamp,
          outcome: 'success',
          durationMs: 5000,
          searchDurationMs: 100,
          indexingDurationMs: 50,
          scheduleDelayMs: 3000,
        }),
        ...makeExecutionEvents({
          ruleId: rule2.id,
          ruleName: 'Alert Testing Query',
          timestamp,
          outcome: 'success',
          durationMs: 2000,
          searchDurationMs: 40,
          indexingDurationMs: 20,
          scheduleDelayMs: 1500,
        }),
      ] as object[];

      await indexEventLogExecutionEvents(es, log, events);

      await retry.try(async () => {
        const body = await getSpaceHealth(supertest, {
          interval: { type: 'last_day', granularity: 'hour' },
        });

        expect(body).toMatchObject({
          timings: {
            requested_at: expect.any(String),
            processed_at: expect.any(String),
            processing_time_ms: expect.any(Number),
          },
          parameters: {
            interval: {
              type: 'last_day',
              granularity: 'hour',
            },
          },
          health: {
            state_at_the_moment: {
              number_of_rules: {
                all: { total: 2, enabled: 0, disabled: 2 },
                by_origin: {
                  custom: { total: 2, enabled: 0, disabled: 2 },
                  prebuilt: { total: 0, enabled: 0, disabled: 0 },
                },
                by_type: { 'siem.queryRule': { total: 2, enabled: 0, disabled: 2 } },
                by_outcome: {},
              },
            },
            stats_over_interval: {
              number_of_executions: {
                total: 2,
                by_outcome: { succeeded: 2, warning: 0, failed: 0 },
              },
            },
            history_over_interval: {
              buckets: expect.any(Array),
            },
          },
        });
      });
    });

    it('should return top N rules with correct metrics and ordering', async () => {
      const now = moment().utc();
      const timestamp = now.clone().subtract(30, 'minutes').toISOString();

      const rule1 = await createRule(
        supertest,
        log,
        getRuleForAlertTesting(['test-index'], uuidv4(), false)
      );
      const rule2 = await createRule(
        supertest,
        log,
        getRuleForAlertTesting(['test-index'], uuidv4(), false)
      );
      const rule3 = await createRule(
        supertest,
        log,
        getRuleForAlertTesting(['test-index'], uuidv4(), false)
      );

      const events = [
        ...makeExecutionEvents({
          ruleId: rule1.id,
          ruleName: 'Alert Testing Query',
          timestamp,
          outcome: 'success',
          durationMs: 10000,
          searchDurationMs: 500,
          indexingDurationMs: 200,
          scheduleDelayMs: 5000,
        }),
        ...makeExecutionEvents({
          ruleId: rule2.id,
          ruleName: 'Alert Testing Query',
          timestamp,
          outcome: 'success',
          durationMs: 5000,
          searchDurationMs: 250,
          indexingDurationMs: 100,
          scheduleDelayMs: 2500,
        }),
        ...makeExecutionEvents({
          ruleId: rule3.id,
          ruleName: 'Alert Testing Query',
          timestamp,
          outcome: 'success',
          durationMs: 1000,
          searchDurationMs: 50,
          indexingDurationMs: 10,
          scheduleDelayMs: 500,
        }),
      ] as object[];

      await indexEventLogExecutionEvents(es, log, events);

      await retry.try(async () => {
        const body = await getSpaceHealth(supertest, {
          interval: { type: 'last_day', granularity: 'hour' },
          num_of_top_rules: 2,
        });

        const { top_rules: topRules } = body.health.stats_over_interval;

        const topRuleEntry = (ruleId: string, percentileValue: number) => ({
          id: ruleId,
          name: 'Alert Testing Query',
          category: 'siem.queryRule',
          percentiles: {
            '50.0': percentileValue,
            '95.0': percentileValue,
            '99.0': percentileValue,
            '99.9': percentileValue,
          },
        });

        expect(topRules.by_execution_duration_ms).toEqual([
          topRuleEntry(rule1.id, 10000),
          topRuleEntry(rule2.id, 5000),
        ]);

        expect(topRules.by_schedule_delay_ms).toEqual([
          topRuleEntry(rule1.id, 5000),
          topRuleEntry(rule2.id, 2500),
        ]);

        expect(topRules.by_search_duration_ms).toEqual([
          topRuleEntry(rule1.id, 500),
          topRuleEntry(rule2.id, 250),
        ]);

        expect(topRules.by_indexing_duration_ms).toEqual([
          topRuleEntry(rule1.id, 200),
          topRuleEntry(rule2.id, 100),
        ]);
      });
    });
  });
};
