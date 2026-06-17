/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import dateMath from '@kbn/datemath';
import expect from 'expect';
import moment from 'moment';
import { set } from '@kbn/safer-lodash-set';
import { v4 as uuidv4 } from 'uuid';
import { readRuleExecutionResultsUrl } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '@kbn/detections-response-ftr-services';
import { deleteAllEventLogExecutionEvents, indexEventLogExecutionEvents } from '../../../utils';
import {
  successfulExecuteEvent,
  warningExecuteEvent,
  failedExecuteEvent,
  manualRunExecuteEvent,
} from './template_data/unified_execution_outcome';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const mockExecutionEvent = (
  template: typeof successfulExecuteEvent,
  {
    ruleId,
    timestamp = moment().utc().toISOString(),
    executionId = uuidv4(),
    backfill,
  }: {
    ruleId: string;
    timestamp?: string;
    executionId?: string;
    backfill?: { start: string; interval: string };
  }
) => {
  const event = cloneDeep(template);
  set(event, '@timestamp', timestamp);
  set(event, 'event.start', timestamp);
  set(event, 'event.end', timestamp);
  set(event, 'rule.id', ruleId);
  set(event, 'kibana.saved_objects[0].id', ruleId);
  set(event, 'kibana.alert.rule.execution.uuid', executionId);
  if (backfill) {
    set(event, 'kibana.alert.rule.execution.backfill.start', backfill.start);
    set(event, 'kibana.alert.rule.execution.backfill.interval', backfill.interval);
  }
  return event;
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless Rule Execution Results', () => {
    before(async () => {
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    describe('Error handling', () => {
      it('should return 404 for a non-existent rule', async () => {
        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl('nonexistent-rule-id'))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(404);
      });
    });

    describe('Base functionality', () => {
      it('should return execution results for successful AF execute events', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const executionId = uuidv4();
        const event = mockExecutionEvent(successfulExecuteEvent, { ruleId: id, executionId });

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(1);
        expect(response.body.data[0]).toMatchObject({
          execution_uuid: executionId,
          outcome: { status: 'success' },
          execution_duration_ms: expect.any(Number),
          backfill: null,
          metrics: {
            matched_indices_count: null,
            alerts_candidate_count: null,
            total_search_duration_ms: expect.any(Number),
          },
          schedule_delay_ms: expect.any(Number),
        });
        expect(response.body.data[0].execution_duration_ms).toBeGreaterThan(0);
      });

      it('should return execution results with errors for failed executions', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const event = mockExecutionEvent(failedExecuteEvent, { ruleId: id });

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(1);
        expect(response.body.data[0].outcome).toMatchObject({
          status: 'failure',
          message: expect.stringContaining('unrecoverable error'),
        });
      });

      it('should return execution results with warnings', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const event = mockExecutionEvent(warningExecuteEvent, { ruleId: id });

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.data[0].outcome).toMatchObject({
          status: 'warning',
          message: expect.stringContaining('matching indices'),
        });
      });

      it('should return correctly converted backfill values', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const backfillStart = '2026-03-11T00:00:00.000Z';
        const backfillInterval = '1d';
        const event = mockExecutionEvent(manualRunExecuteEvent, {
          ruleId: id,
          backfill: { start: backfillStart, interval: backfillInterval },
        });

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.data[0].backfill).toEqual({
          from: moment(backfillStart).subtract(1, 'day').toISOString(),
          to: backfillStart,
        });
      });

      it('should return empty results when no events match', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(0);
        expect(response.body.data).toEqual([]);
      });

      it('should support pagination', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const events = Array.from({ length: 3 }, (_, i) =>
          mockExecutionEvent(successfulExecuteEvent, {
            ruleId: id,
            timestamp: moment().utc().add(i, 'm').toISOString(),
          })
        );

        await indexEventLogExecutionEvents(es, log, events);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const page1 = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to }, page: 1, per_page: 2 });

        expect(page1.status).toEqual(200);
        expect(page1.body).toMatchObject({ total: 3, page: 1, per_page: 2 });
        expect(page1.body.data).toHaveLength(2);

        const page2 = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to }, page: 2, per_page: 2 });

        expect(page2.status).toEqual(200);
        expect(page2.body).toMatchObject({ total: 3, page: 2, per_page: 2 });
        expect(page2.body.data).toHaveLength(1);
      });
    });

    describe('Sorting', () => {
      it('should sort by timestamp desc by default', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const timestamps = [
          moment().utc().subtract(2, 'h').toISOString(),
          moment().utc().subtract(1, 'h').toISOString(),
          moment().utc().toISOString(),
        ];

        const events = timestamps.map((timestamp) =>
          mockExecutionEvent(successfulExecuteEvent, { ruleId: id, timestamp })
        );

        await indexEventLogExecutionEvents(es, log, events);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.data).toHaveLength(3);
        const resultTimestamps = response.body.data.map((e: any) => e.execution_start);
        expect(resultTimestamps).toEqual([...resultTimestamps].sort().reverse());
      });
    });

    describe('Filtering', () => {
      it('by execution status', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const events = [successfulExecuteEvent, failedExecuteEvent].map((template, i) =>
          mockExecutionEvent(template, {
            ruleId: id,
            timestamp: moment().utc().add(i, 'm').toISOString(),
          })
        );

        await indexEventLogExecutionEvents(es, log, events);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to, outcome: ['failure'] } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(1);
        expect(response.body.data[0].outcome.status).toEqual('failure');
      });

      it('by run type: scheduled', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const scheduledEvent = mockExecutionEvent(successfulExecuteEvent, { ruleId: id });
        const manualEvent = mockExecutionEvent(manualRunExecuteEvent, {
          ruleId: id,
          timestamp: moment().utc().add(1, 'm').toISOString(),
        });

        await indexEventLogExecutionEvents(es, log, [scheduledEvent, manualEvent]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to, run_type: ['standard'] } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(1);
      });

      it('by run type: manual', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const scheduledEvent = mockExecutionEvent(successfulExecuteEvent, { ruleId: id });
        const manualEvent = mockExecutionEvent(manualRunExecuteEvent, {
          ruleId: id,
          timestamp: moment().utc().add(1, 'm').toISOString(),
        });

        await indexEventLogExecutionEvents(es, log, [scheduledEvent, manualEvent]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to, run_type: ['backfill'] } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(1);
        expect(response.body.data[0].metrics).toBeTruthy();
      });

      it('by time range: only returns events within the specified window', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const insideTs = moment().utc().subtract(1, 'h').toISOString();
        const outsideTs = moment().utc().subtract(3, 'd').toISOString();

        const insideEvent = mockExecutionEvent(successfulExecuteEvent, {
          ruleId: id,
          timestamp: insideTs,
        });
        const outsideEvent = mockExecutionEvent(successfulExecuteEvent, {
          ruleId: id,
          timestamp: outsideTs,
        });

        await indexEventLogExecutionEvents(es, log, [insideEvent, outsideEvent]);

        const from = moment().utc().subtract(24, 'h').toISOString();
        const to = moment().utc().add(1, 'h').toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).toEqual(200);
        expect(response.body.total).toEqual(1);
        expect(response.body.data[0].execution_start).toEqual(insideTs);
      });
    });
  });
};
