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
import { v4 as uuid } from 'uuid';
import {
  getRuleExecutionResultsUrl,
  RuleExecutionStatus,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_monitoring';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteAllEventLogExecutionEvents,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  indexEventLogExecutionEvents,
  waitForEventLogExecuteComplete,
  waitForRuleSuccessOrStatus,
} from '../../utils';
import {
  failedGapExecution,
  failedRanAfterDisabled,
  successfulExecution,
} from './template_data/execution_events';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('Get Rule Execution Results', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alias');
      await createSignalsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alias');
      await deleteSignalsIndex(supertest, log);
    });

    beforeEach(async () => {
      await deleteAllAlerts(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    it('should return an error if rule does not exist', async () => {
      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl('1'))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(404);
      expect(response.text).to.eql(
        '{"message":"Saved object [alert/1] not found","status_code":404}'
      );
    });

    it('should return execution events for a rule that has executed successfully', async () => {
      const rule = getRuleForSignalTesting(['auditbeat-*']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id);
      await waitForEventLogExecuteComplete(es, log, id);

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].gap_duration_s).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('succeeded');
      expect(response.body.events[0].security_message).to.eql(
        'Rule execution completed successfully'
      );
    });

    it('should return execution events for a rule that has executed in a warning state', async () => {
      const rule = getRuleForSignalTesting(['no-name-index']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id, RuleExecutionStatus['partial failure']);
      await waitForEventLogExecuteComplete(es, log, id);

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.eql(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.eql(0);
      expect(response.body.events[0].gap_duration_s).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('partial failure');
      expect(
        response.body.events[0].security_message.startsWith(
          'This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ["no-name-index"] was found.'
        )
      ).to.eql(true);
    });

    it('should return execution events for a rule that has executed in a failure state with a gap', async () => {
      const rule = getRuleForSignalTesting(['auditbeat-*'], uuid.v4(), false);
      const { id } = await createRule(supertest, log, rule);

      const start = dateMath.parse('now')?.utc().toISOString();
      const end = dateMath.parse('now+24h', { roundUp: true })?.utc().toISOString();

      // Create 5 timestamps (failedGapExecution.length) a minute apart to use in the templated data
      const dateTimes = [...Array(failedGapExecution.length).keys()].map((i) =>
        moment(start)
          .add(i + 1, 'm')
          .toDate()
          .toISOString()
      );

      const events = failedGapExecution.map((e, i) => {
        set(e, '@timestamp', dateTimes[i]);
        set(e, 'event.start', dateTimes[i]);
        set(e, 'event.end', dateTimes[i]);
        set(e, 'rule.id', id);
        set(e, 'kibana.saved_objects[0].id', id);
        return e;
      });

      await indexEventLogExecutionEvents(es, log, events);
      await waitForEventLogExecuteComplete(es, log, id);

      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.eql(1545);
      expect(response.body.events[0].search_duration_ms).to.eql(0);
      expect(response.body.events[0].schedule_delay_ms).to.eql(544808);
      expect(response.body.events[0].indexing_duration_ms).to.eql(0);
      expect(response.body.events[0].gap_duration_s).to.eql(245);
      expect(response.body.events[0].security_status).to.eql('failed');
      expect(
        response.body.events[0].security_message.startsWith(
          '4 minutes (244689ms) were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances.'
        )
      ).to.eql(true);
    });

    // For details, see: https://github.com/elastic/kibana/issues/131382
    it('should return execution events ordered by @timestamp desc when a status filter is active and there are more than 1000 executions', async () => {
      const rule = getRuleForSignalTesting(['auditbeat-*'], uuid.v4(), false);
      const { id } = await createRule(supertest, log, rule);

      // Daterange for which we'll generate execution events between
      const start = dateMath.parse('now')?.utc().toISOString();
      const end = dateMath.parse('now+24d', { roundUp: true })?.utc().toISOString();

      // 1002 total executions total, one minute apart
      const dateTimes = [...Array(1002).keys()].map((i) =>
        moment(start)
          .add(i + 1, 'm')
          .toDate()
          .toISOString()
      );

      // Create 1000 successful executions
      const events = dateTimes.slice(0, 1000).flatMap((dateTime) => {
        const executionId = uuid.v4();
        return cloneDeep(successfulExecution).map((e, i) => {
          set(e, '@timestamp', dateTime);
          set(e, 'event.start', dateTime);
          set(e, 'event.end', dateTime);
          set(e, 'rule.id', id);
          set(e, 'kibana.saved_objects[0].id', id);
          set(e, 'kibana.alert.rule.execution.uuid', executionId);
          return e;
        });
      });

      await indexEventLogExecutionEvents(es, log, events);

      // Create 2 failed executions
      const failedEvents = dateTimes.slice(1000).flatMap((dateTime) => {
        const executionId = uuid.v4();
        return cloneDeep(failedRanAfterDisabled).map((e, i) => {
          set(e, '@timestamp', dateTime);
          set(e, 'event.start', dateTime);
          set(e, 'event.end', dateTime);
          set(e, 'rule.id', id);
          set(e, 'kibana.saved_objects[0].id', id);
          set(e, 'kibana.alert.rule.execution.uuid', executionId);
          return e;
        });
      });

      await indexEventLogExecutionEvents(es, log, failedEvents);
      await waitForEventLogExecuteComplete(es, log, id, 1002);

      // Be sure to provide between 1-2 filters so that the server must prefetch events
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set('kbn-xsrf', 'true')
        .query({ start, end, status_filters: 'failed,succeeded' });

      // Verify the most recent execution was one of the failedRanAfterDisabled executions, which have a duration of 3ms and are made up of 2 docs per execution,
      // and not one of the successfulExecution executions, which have a duration of 3183ms and are made up of 5 docs per execution
      // The bug was because the prefetch of events was sorted by doc count by default, not `@timestamp`, which would result in the successful events pushing the 2 more recent
      // failed events out of the 1000 query size of the prefetch query, which would result in only the successful executions being returned even though there were more recent
      // failed executions
      expect(response.body.total).to.eql(1002);
      expect(response.body.events[0].duration_ms).to.eql(3);
    });
  });
};
