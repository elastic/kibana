/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import dateMath from '@kbn/datemath';
import expect from '@kbn/expect';
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
} from './template_data/unified_execution_outcome_events';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless POST Rule Execution Results (Unified)', () => {
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

        expect(response.status).to.eql(404);
      });
    });

    describe('Base functionality', () => {
      it('should return execution results for successful AF execute events', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const executionId = uuidv4();
        const now = moment().utc().toISOString();
        const event = cloneDeep(successfulExecuteEvent);
        set(event, '@timestamp', now);
        set(event, 'event.start', now);
        set(event, 'event.end', now);
        set(event, 'rule.id', id);
        set(event, 'kibana.saved_objects[0].id', id);
        set(event, 'kibana.alert.rule.execution.uuid', executionId);

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(1);
        expect(response.body.executions[0].execution_uuid).to.eql(executionId);
        expect(response.body.executions[0].outcome.status).to.eql('success');
        expect(response.body.executions[0].metrics.duration_ms).to.greaterThan(0);
        expect(response.body.executions[0].metrics.indices_found_count).to.eql(10);
        expect(response.body.executions[0].metrics.alerts.candidate_count).to.eql(10);
        expect(response.body.executions[0].metrics.search_duration_ms).to.be.a('number');
        expect(response.body.executions[0].metrics.scheduling_delay).to.be.a('number');
      });

      it('should return execution results with errors for failed executions', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const executionId = uuidv4();
        const now = moment().utc().toISOString();
        const event = cloneDeep(failedExecuteEvent);
        set(event, '@timestamp', now);
        set(event, 'event.start', now);
        set(event, 'event.end', now);
        set(event, 'rule.id', id);
        set(event, 'kibana.saved_objects[0].id', id);
        set(event, 'kibana.alert.rule.execution.uuid', executionId);

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(1);
        expect(response.body.executions[0].outcome.status).to.eql('failure');
        expect(response.body.executions[0].outcome.message).to.contain('unrecoverable error');
      });

      it('should return execution results with warnings', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const executionId = uuidv4();
        const now = moment().utc().toISOString();
        const event = cloneDeep(warningExecuteEvent);
        set(event, '@timestamp', now);
        set(event, 'event.start', now);
        set(event, 'event.end', now);
        set(event, 'rule.id', id);
        set(event, 'kibana.saved_objects[0].id', id);
        set(event, 'kibana.alert.rule.execution.uuid', executionId);

        await indexEventLogExecutionEvents(es, log, [event]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).to.eql(200);
        expect(response.body.executions[0].outcome.status).to.eql('warning');
        expect(response.body.executions[0].outcome.message).to.contain('matching indices');
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

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(0);
        expect(response.body.executions).to.eql([]);
      });

      it('should support pagination', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const events = Array.from({ length: 3 }, (_, i) => {
          const event = cloneDeep(successfulExecuteEvent);
          const ts = moment().utc().add(i, 'm').toISOString();
          set(event, '@timestamp', ts);
          set(event, 'event.start', ts);
          set(event, 'event.end', ts);
          set(event, 'rule.id', id);
          set(event, 'kibana.saved_objects[0].id', id);
          set(event, 'kibana.alert.rule.execution.uuid', uuidv4());
          return event;
        });

        await indexEventLogExecutionEvents(es, log, events);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const page1 = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to }, page: 1, per_page: 2 });

        expect(page1.status).to.eql(200);
        expect(page1.body.total).to.eql(3);
        expect(page1.body.executions).to.have.length(2);
        expect(page1.body.page).to.eql(1);
        expect(page1.body.per_page).to.eql(2);

        const page2 = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to }, page: 2, per_page: 2 });

        expect(page2.status).to.eql(200);
        expect(page2.body.total).to.eql(3);
        expect(page2.body.executions).to.have.length(1);
        expect(page2.body.page).to.eql(2);
        expect(page2.body.per_page).to.eql(2);
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

        const events = timestamps.map((ts) => {
          const event = cloneDeep(successfulExecuteEvent);
          set(event, '@timestamp', ts);
          set(event, 'event.start', ts);
          set(event, 'event.end', ts);
          set(event, 'rule.id', id);
          set(event, 'kibana.saved_objects[0].id', id);
          set(event, 'kibana.alert.rule.execution.uuid', uuidv4());
          return event;
        });

        await indexEventLogExecutionEvents(es, log, events);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();
        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).to.eql(200);
        expect(response.body.executions).to.have.length(3);
        const resultTimestamps = response.body.executions.map((e: any) => e.timestamp);
        expect(resultTimestamps).to.eql([...resultTimestamps].sort().reverse());
      });
    });

    describe('Filtering', () => {
      it('by execution status', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const events = [successfulExecuteEvent, failedExecuteEvent].map((template, i) => {
          const event = cloneDeep(template);
          const ts = moment().utc().add(i, 'm').toISOString();
          set(event, '@timestamp', ts);
          set(event, 'event.start', ts);
          set(event, 'event.end', ts);
          set(event, 'rule.id', id);
          set(event, 'kibana.saved_objects[0].id', id);
          set(event, 'kibana.alert.rule.execution.uuid', uuidv4());
          return event;
        });

        await indexEventLogExecutionEvents(es, log, events);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to, status: ['failure'] } });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(1);
        expect(response.body.executions[0].outcome.status).to.eql('failure');
      });

      it('by run type: scheduled', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const scheduledEvent = cloneDeep(successfulExecuteEvent);
        const manualEvent = cloneDeep(manualRunExecuteEvent);

        const ts1 = moment().utc().toISOString();
        const ts2 = moment().utc().add(1, 'm').toISOString();

        set(scheduledEvent, '@timestamp', ts1);
        set(scheduledEvent, 'event.start', ts1);
        set(scheduledEvent, 'event.end', ts1);
        set(scheduledEvent, 'rule.id', id);
        set(scheduledEvent, 'kibana.saved_objects[0].id', id);
        set(scheduledEvent, 'kibana.alert.rule.execution.uuid', uuidv4());

        set(manualEvent, '@timestamp', ts2);
        set(manualEvent, 'event.start', ts2);
        set(manualEvent, 'event.end', ts2);
        set(manualEvent, 'rule.id', id);
        set(manualEvent, 'kibana.saved_objects[0].id', id);
        set(manualEvent, 'kibana.alert.rule.execution.uuid', uuidv4());

        await indexEventLogExecutionEvents(es, log, [scheduledEvent, manualEvent]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to, run_type: ['standard'] } });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(1);
      });

      it('by run type: manual', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const scheduledEvent = cloneDeep(successfulExecuteEvent);
        const manualEvent = cloneDeep(manualRunExecuteEvent);

        const ts1 = moment().utc().toISOString();
        const ts2 = moment().utc().add(1, 'm').toISOString();

        set(scheduledEvent, '@timestamp', ts1);
        set(scheduledEvent, 'event.start', ts1);
        set(scheduledEvent, 'event.end', ts1);
        set(scheduledEvent, 'rule.id', id);
        set(scheduledEvent, 'kibana.saved_objects[0].id', id);
        set(scheduledEvent, 'kibana.alert.rule.execution.uuid', uuidv4());

        set(manualEvent, '@timestamp', ts2);
        set(manualEvent, 'event.start', ts2);
        set(manualEvent, 'event.end', ts2);
        set(manualEvent, 'rule.id', id);
        set(manualEvent, 'kibana.saved_objects[0].id', id);
        set(manualEvent, 'kibana.alert.rule.execution.uuid', uuidv4());

        await indexEventLogExecutionEvents(es, log, [scheduledEvent, manualEvent]);

        const from = dateMath.parse('now-24h')?.utc().toISOString();
        const to = dateMath.parse('now+1h', { roundUp: true })?.utc().toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to, run_type: ['backfill'] } });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(1);
        expect(response.body.executions[0].metrics).to.be.ok();
      });

      it('by time range: only returns events within the specified window', async () => {
        const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
        const { id } = await createRule(supertest, log, rule);

        const insideTs = moment().utc().subtract(1, 'h').toISOString();
        const outsideTs = moment().utc().subtract(3, 'd').toISOString();

        const insideEvent = cloneDeep(successfulExecuteEvent);
        set(insideEvent, '@timestamp', insideTs);
        set(insideEvent, 'event.start', insideTs);
        set(insideEvent, 'event.end', insideTs);
        set(insideEvent, 'rule.id', id);
        set(insideEvent, 'kibana.saved_objects[0].id', id);
        set(insideEvent, 'kibana.alert.rule.execution.uuid', uuidv4());

        const outsideEvent = cloneDeep(successfulExecuteEvent);
        set(outsideEvent, '@timestamp', outsideTs);
        set(outsideEvent, 'event.start', outsideTs);
        set(outsideEvent, 'event.end', outsideTs);
        set(outsideEvent, 'rule.id', id);
        set(outsideEvent, 'kibana.saved_objects[0].id', id);
        set(outsideEvent, 'kibana.alert.rule.execution.uuid', uuidv4());

        await indexEventLogExecutionEvents(es, log, [insideEvent, outsideEvent]);

        const from = moment().utc().subtract(24, 'h').toISOString();
        const to = moment().utc().add(1, 'h').toISOString();

        const response = await supertest
          .post(readRuleExecutionResultsUrl(id))
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ filter: { from, to } });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.eql(1);
        expect(response.body.executions[0].timestamp).to.eql(insideTs);
      });
    });
  });
};
