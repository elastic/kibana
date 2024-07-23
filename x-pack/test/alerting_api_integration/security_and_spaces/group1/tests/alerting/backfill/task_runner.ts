/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SecurityAlert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_LAST_DETECTED,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import {
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '@kbn/alerting-plugin/server/saved_objects';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';
import {
  createEsDocument,
  DOCUMENT_REFERENCE,
  DOCUMENT_SOURCE,
} from '../../../../../spaces_only/tests/alerting/create_test_data';
import { asyncForEach } from '../../../../../../functional/services/transform/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { SuperuserAtSpace1 } from '../../../../scenarios';
import {
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
  TaskManagerDoc,
} from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createBackfillTaskRunnerTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  const alertsAsDataIndex = '.alerts-security.alerts-space1';
  const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
  const originalDocTimestamps = [
    // before first backfill run
    moment().utc().subtract(14, 'days').toISOString(),

    // backfill execution set 1
    moment().utc().startOf('day').subtract(13, 'days').add(64, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(13, 'days').add(65, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(13, 'days').add(66, 'seconds').toISOString(),

    // backfill execution set 2
    moment().utc().startOf('day').subtract(12, 'days').add(89, 'seconds').toISOString(),

    // backfill execution set 3
    moment().utc().startOf('day').subtract(11, 'days').add(785, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(11, 'days').add(888, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(11, 'days').add(954, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(11, 'days').add(1045, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(11, 'days').add(1145, 'seconds').toISOString(),

    // backfill execution set 4 purposely left empty

    // after last backfill
    moment().utc().startOf('day').subtract(9, 'days').add(666, 'seconds').toISOString(),
    moment().utc().startOf('day').subtract(9, 'days').add(667, 'seconds').toISOString(),
  ];

  describe('ad hoc backfill task', () => {
    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });
    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });
    after(async () => {
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    // This test
    // - indexes some documents in the test index with specific timestamps
    // - creates a siem.queryRule to query the test index
    // - schedules a backfill for the siem.queryRule
    // - checks that the expected alerts are generated in the alerts as data index
    // - checks that the timestamps in the alerts are as expected
    // - checks that the expected event log documents are written for the backfill
    it('should run all execution sets of a scheduled backfill and correctly generate alerts', async () => {
      const spaceId = SuperuserAtSpace1.space.id;

      // Index documents
      await indexTestDocs();

      // Create siem.queryRule
      const response1 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send({
          enabled: true,
          name: 'test siem query rule',
          tags: [],
          rule_type_id: 'siem.queryRule',
          consumer: 'siem',
          schedule: { interval: '24h' },
          actions: [],
          params: {
            author: [],
            description: 'test',
            falsePositives: [],
            from: 'now-86460s',
            ruleId: '31c54f10-9d3b-45a8-b064-b92e8c6fcbe7',
            immutable: false,
            license: '',
            outputIndex: '',
            meta: {
              from: '1m',
              kibana_siem_app_url: 'https://localhost:5601/app/security',
            },
            maxSignals: 100,
            riskScore: 21,
            riskScoreMapping: [],
            severity: 'low',
            severityMapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptionsList: [],
            relatedIntegrations: [],
            requiredFields: [],
            setup: '',
            type: 'query',
            language: 'kuery',
            index: [ES_TEST_INDEX_NAME],
            query: `source:${DOCUMENT_SOURCE}`,
            filters: [],
          },
        })
        .expect(200);
      const ruleId = response1.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      const start = moment().utc().startOf('day').subtract(13, 'days').toISOString();
      const end = moment().utc().startOf('day').subtract(9, 'days').toISOString();

      // Schedule backfill for this rule
      const response2 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, start, end }])
        .expect(200);

      const scheduleResult = response2.body;

      expect(scheduleResult.length).to.eql(1);
      expect(scheduleResult[0].schedule.length).to.eql(4);

      let currentStart = start;
      scheduleResult[0].schedule.forEach((sched: any) => {
        expect(sched.interval).to.eql('24h');
        expect(sched.status).to.eql('pending');
        const runAt = moment(currentStart).add(24, 'hours').toISOString();
        expect(sched.run_at).to.eql(runAt);
        currentStart = runAt;
      });

      const backfillId = scheduleResult[0].id;

      // check that the task was scheduled correctly
      const taskRecord = await getScheduledTask(backfillId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('ad_hoc_run-backfill');
      expect(taskRecord.task.timeoutOverride).to.eql('5m');
      expect(taskRecord.task.enabled).to.eql(true);
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        adHocRunParamsId: backfillId,
        spaceId,
      });

      // get the execute-backfill events
      const events: IValidatedEvent[] = await waitForEventLogDocs(
        backfillId,
        spaceId,
        new Map([['execute-backfill', { equal: 4 }]])
      );

      // each execute-backfill event should have these fields
      for (const e of events) {
        expect(e?.event?.provider).to.eql('alerting');
        expect(e?.event?.action).to.eql('execute-backfill');
        expect(e?.event?.outcome).to.eql('success');
        expect(e?.['@timestamp']).to.match(timestampPattern);
        expect(e?.event?.start).to.match(timestampPattern);
        expect(e?.event?.end).to.match(timestampPattern);
        expect(e?.rule?.id).to.eql(ruleId);
        expect(e?.rule?.category).to.eql('siem.queryRule');
        expect(e?.rule?.license).to.eql('basic');
        expect(e?.rule?.ruleset).to.eql('siem');
        expect(e?.rule?.name).to.eql('test siem query rule');
        expect(e?.kibana?.alert?.rule?.consumer).to.eql('siem');
        expect(e?.kibana?.alert?.rule?.rule_type_id).to.eql('siem.queryRule');
        expect(e?.kibana?.alert?.rule?.execution?.backfill?.id).to.eql(backfillId);
        expect(e?.kibana?.saved_objects).to.eql([
          {
            rel: 'primary',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id: backfillId,
            namespace: 'space1',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
            type_id: 'siem.queryRule',
            namespace: 'space1',
          },
        ]);
        expect(e?.kibana?.space_ids).to.eql(['space1']);
      }

      // save the execution UUIDs
      const executionUuids = events.map((e) => e?.kibana?.alert?.rule?.execution?.uuid);

      // active alert counts and backfill info will differ per backfill run
      expect(events[0]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.eql(3);
      expect(events[0]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[0].run_at
      );
      expect(events[0]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[0].interval
      );

      expect(events[1]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.eql(1);
      expect(events[1]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[1].run_at
      );
      expect(events[1]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[1].interval
      );

      expect(events[2]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.eql(5);
      expect(events[2]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[2].run_at
      );
      expect(events[0]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[2].interval
      );

      expect(events[3]?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.eql(0);
      expect(events[3]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[3].run_at
      );
      expect(events[0]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[3].interval
      );

      // query for alert docs
      const alertDocs = await queryForAlertDocs<SecurityAlert>();
      expect(alertDocs.length).to.eql(9);

      // each alert doc should have these fields
      for (const alert of alertDocs) {
        const source = alert._source!;
        expect(source[ALERT_RULE_CATEGORY]).to.eql('Custom Query Rule');
        expect(source[ALERT_RULE_CONSUMER]).to.eql('siem');
        expect(source[ALERT_RULE_NAME]).to.eql('test siem query rule');
        expect(source[ALERT_RULE_PRODUCER]).to.eql('siem');
        expect(source[ALERT_RULE_TYPE_ID]).to.eql('siem.queryRule');
        expect(source[ALERT_RULE_UUID]).to.eql(ruleId);
        expect(source[SPACE_IDS]).to.eql(['space1']);
        expect(source[EVENT_KIND]).to.eql('signal');
        expect(source[ALERT_STATUS]).to.eql('active');
        expect(source[ALERT_WORKFLOW_STATUS]).to.eql('open');
      }

      // backfill run 1 alerts
      const alertDocsBackfill1 = alertDocs.filter(
        (alert) => alert._source![ALERT_RULE_EXECUTION_UUID] === executionUuids[0]
      );
      expect(alertDocsBackfill1.length).to.eql(3);

      // check timestamps in alert docs
      for (const alert of alertDocsBackfill1) {
        const source = alert._source!;
        expect(source[ALERT_START]).to.eql(scheduleResult[0].schedule[0].run_at);
        expect(source[ALERT_LAST_DETECTED]).to.eql(scheduleResult[0].schedule[0].run_at);
        expect(source[TIMESTAMP]).to.eql(scheduleResult[0].schedule[0].run_at);
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).to.match(timestampPattern);
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).not.to.eql(
          scheduleResult[0].schedule[0].run_at
        );
      }

      expect(alertDocsBackfill1[0]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[1]);
      expect(alertDocsBackfill1[1]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[2]);
      expect(alertDocsBackfill1[2]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[3]);

      // backfill run 2 alerts
      const alertDocsBackfill2 = alertDocs.filter(
        (alert) => alert._source![ALERT_RULE_EXECUTION_UUID] === executionUuids[1]
      );
      expect(alertDocsBackfill2.length).to.eql(1);

      // check timestamps in alert docs
      for (const alert of alertDocsBackfill2) {
        const source = alert._source!;
        expect(source[ALERT_START]).to.eql(scheduleResult[0].schedule[1].run_at);
        expect(source[ALERT_LAST_DETECTED]).to.eql(scheduleResult[0].schedule[1].run_at);
        expect(source[TIMESTAMP]).to.eql(scheduleResult[0].schedule[1].run_at);
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).to.match(timestampPattern);
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).not.to.eql(
          scheduleResult[0].schedule[1].run_at
        );
      }

      expect(alertDocsBackfill2[0]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[4]);

      // backfill run 3 alerts
      const alertDocsBackfill3 = alertDocs.filter(
        (alert) => alert._source![ALERT_RULE_EXECUTION_UUID] === executionUuids[2]
      );
      expect(alertDocsBackfill3.length).to.eql(5);

      // check timestamps in alert docs
      for (const alert of alertDocsBackfill3) {
        const source = alert._source!;
        expect(source[ALERT_START]).to.eql(scheduleResult[0].schedule[2].run_at);
        expect(source[ALERT_LAST_DETECTED]).to.eql(scheduleResult[0].schedule[2].run_at);
        expect(source[TIMESTAMP]).to.eql(scheduleResult[0].schedule[2].run_at);
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).to.match(timestampPattern);
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).not.to.eql(
          scheduleResult[0].schedule[2].run_at
        );
      }

      expect(alertDocsBackfill3[0]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[5]);
      expect(alertDocsBackfill3[1]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[6]);
      expect(alertDocsBackfill3[2]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[7]);
      expect(alertDocsBackfill3[3]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[8]);
      expect(alertDocsBackfill3[4]._source![ALERT_ORIGINAL_TIME]).to.eql(originalDocTimestamps[9]);

      // backfill run 4 alerts
      const alertDocsBackfill4 = alertDocs.filter(
        (alert) => alert._source![ALERT_RULE_EXECUTION_UUID] === executionUuids[3]
      );
      expect(alertDocsBackfill4.length).to.eql(0);

      // task should have been deleted after backfill runs have finished
      const numHits = await searchScheduledTask(backfillId);
      expect(numHits).to.eql(0);
    });

    it('should handle timeouts', async () => {
      const spaceId = SuperuserAtSpace1.space.id;
      // create a rule that always times out
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAutoRecoverFalse',
            params: {
              pattern: {
                instance: ['timeout'],
              },
            },
            schedule: { interval: '12h' },
          })
        )
        .expect(200);
      const ruleId = response.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      // schedule backfill for this rule
      const start = moment().utc().startOf('day').subtract(13, 'days').toISOString();
      const response2 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, start }])
        .expect(200);

      const scheduleResult = response2.body;

      expect(scheduleResult.length).to.eql(1);
      expect(scheduleResult[0].schedule.length).to.eql(1);
      expect(scheduleResult[0].schedule).to.eql([
        {
          interval: '12h',
          run_at: moment(start).add(12, 'hours').toISOString(),
          status: 'pending',
        },
      ]);

      const backfillId = scheduleResult[0].id;

      // check that the task was scheduled correctly
      const taskRecord = await getScheduledTask(backfillId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('ad_hoc_run-backfill');
      expect(taskRecord.task.timeoutOverride).to.eql('10s');
      expect(taskRecord.task.enabled).to.eql(true);
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        adHocRunParamsId: backfillId,
        spaceId,
      });

      // get the execute-timeout and execute-backfill events
      const events: IValidatedEvent[] = await waitForEventLogDocs(
        backfillId,
        spaceId,
        new Map([
          ['execute-timeout', { equal: 1 }],
          ['execute-backfill', { equal: 1 }],
        ])
      );

      // each event log event should have these fields
      const executeEvents = events.filter((e) => e?.event?.action === 'execute-backfill');
      for (const e of executeEvents) {
        expect(e?.event?.provider).to.eql('alerting');
        expect(e?.event?.action).to.eql('execute-backfill');
        expect(e?.event?.outcome).to.eql('success');
        expect(e?.['@timestamp']).to.match(timestampPattern);
        expect(e?.event?.start).to.match(timestampPattern);
        expect(e?.event?.end).to.match(timestampPattern);
        expect(e?.rule?.id).to.eql(ruleId);
        expect(e?.rule?.category).to.eql('test.patternFiringAutoRecoverFalse');
        expect(e?.rule?.license).to.eql('basic');
        expect(e?.rule?.ruleset).to.eql('alertsFixture');
        expect(e?.rule?.name).to.eql('abc');
        expect(e?.kibana?.alert?.rule?.consumer).to.eql('alertsFixture');
        expect(e?.kibana?.alert?.rule?.rule_type_id).to.eql('test.patternFiringAutoRecoverFalse');
        expect(e?.kibana?.alert?.rule?.execution?.backfill?.id).to.eql(backfillId);
        expect(e?.kibana?.saved_objects).to.eql([
          {
            rel: 'primary',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id: backfillId,
            namespace: 'space1',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
            type_id: 'test.patternFiringAutoRecoverFalse',
            namespace: 'space1',
          },
        ]);
        expect(e?.kibana?.space_ids).to.eql(['space1']);
      }
      const timeoutEvents = events.filter((e) => e?.event?.action === 'execute-timeout');
      for (const e of timeoutEvents) {
        expect(e?.event?.provider).to.eql('alerting');
        expect(e?.event?.action).to.eql('execute-timeout');
        expect(e?.event?.outcome).to.be(undefined);
        expect(e?.['@timestamp']).to.match(timestampPattern);
        expect(e?.event?.start).to.be(undefined);
        expect(e?.event?.end).to.be(undefined);
        expect(e?.rule?.id).to.eql(ruleId);
        expect(e?.rule?.category).to.eql('test.patternFiringAutoRecoverFalse');
        expect(e?.rule?.license).to.eql('basic');
        expect(e?.rule?.ruleset).to.eql('alertsFixture');
        expect(e?.rule?.name).to.eql('abc');
        expect(e?.kibana?.alert?.rule?.consumer).to.eql('alertsFixture');
        expect(e?.kibana?.alert?.rule?.rule_type_id).to.eql('test.patternFiringAutoRecoverFalse');
        expect(e?.kibana?.alert?.rule?.execution?.backfill?.id).to.eql(backfillId);
        expect(e?.kibana?.saved_objects).to.eql([
          {
            rel: 'primary',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id: backfillId,
            namespace: 'space1',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
            type_id: 'test.patternFiringAutoRecoverFalse',
            namespace: 'space1',
          },
        ]);
        expect(e?.kibana?.space_ids).to.eql(['space1']);
        expect(e?.message).to.eql(`backfill "${backfillId}" cancelled due to timeout`);
      }

      // task should have been deleted after backfill runs have finished
      const numHits = await searchScheduledTask(backfillId);
      expect(numHits).to.eql(0);
    });

    it('should handle errors', async () => {
      const spaceId = SuperuserAtSpace1.space.id;
      // create a rule that always errors
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAutoRecoverFalse',
            params: {
              pattern: {
                instance: ['error'],
              },
            },
            schedule: { interval: '12h' },
          })
        )
        .expect(200);
      const ruleId = response.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      // schedule backfill for this rule
      const start = moment().utc().startOf('day').subtract(13, 'days').toISOString();
      const end = moment().utc().startOf('day').subtract(11, 'days').toISOString();
      const response2 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, start, end }])
        .expect(200);

      const scheduleResult = response2.body;

      expect(scheduleResult.length).to.eql(1);
      expect(scheduleResult[0].schedule.length).to.eql(4);
      let currentStart = start;
      scheduleResult[0].schedule.forEach((sched: any) => {
        expect(sched.interval).to.eql('12h');
        expect(sched.status).to.eql('pending');
        const runAt = moment(currentStart).add(12, 'hours').toISOString();
        expect(sched.run_at).to.eql(runAt);
        currentStart = runAt;
      });

      const backfillId = scheduleResult[0].id;

      // check that the task was scheduled correctly
      const taskRecord = await getScheduledTask(backfillId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('ad_hoc_run-backfill');
      expect(taskRecord.task.timeoutOverride).to.eql('10s');
      expect(taskRecord.task.enabled).to.eql(true);
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        adHocRunParamsId: backfillId,
        spaceId,
      });

      // get the execute-backfill events
      const events: IValidatedEvent[] = await waitForEventLogDocs(
        backfillId,
        spaceId,
        new Map([['execute-backfill', { equal: 4 }]])
      );

      // each event log event should have these fields
      for (const e of events) {
        expect(e?.event?.provider).to.eql('alerting');
        expect(e?.event?.action).to.eql('execute-backfill');
        expect(e?.event?.outcome).to.eql('failure');
        expect(e?.event?.reason).to.eql('execute');
        expect(e?.['@timestamp']).to.match(timestampPattern);
        expect(e?.event?.start).to.match(timestampPattern);
        expect(e?.event?.end).to.match(timestampPattern);
        expect(e?.rule?.id).to.eql(ruleId);
        expect(e?.rule?.category).to.eql('test.patternFiringAutoRecoverFalse');
        expect(e?.rule?.license).to.eql('basic');
        expect(e?.rule?.ruleset).to.eql('alertsFixture');
        expect(e?.rule?.name).to.eql('abc');
        expect(e?.kibana?.alert?.rule?.consumer).to.eql('alertsFixture');
        expect(e?.kibana?.alert?.rule?.rule_type_id).to.eql('test.patternFiringAutoRecoverFalse');
        expect(e?.kibana?.alert?.rule?.execution?.backfill?.id).to.eql(backfillId);
        expect(e?.kibana?.saved_objects).to.eql([
          {
            rel: 'primary',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            id: backfillId,
            namespace: 'space1',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
            type_id: 'test.patternFiringAutoRecoverFalse',
            namespace: 'space1',
          },
        ]);
        expect(e?.kibana?.space_ids).to.eql(['space1']);
        expect(e?.kibana?.alerting?.outcome).to.eql('failure');
        expect(e?.kibana?.alerting?.status).to.eql('error');
        expect(e?.message).to.eql(
          `rule execution failure: test.patternFiringAutoRecoverFalse:${ruleId}: 'abc'`
        );
        expect(e?.error?.message).to.eql(`rule executor error`);
      }

      // backfill info will differ per backfill run
      expect(events[0]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[0].run_at
      );
      expect(events[0]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[0].interval
      );
      expect(events[1]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[1].run_at
      );
      expect(events[1]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[1].interval
      );
      expect(events[2]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[2].run_at
      );
      expect(events[2]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[2].interval
      );
      expect(events[3]?.kibana?.alert?.rule?.execution?.backfill?.start).to.eql(
        scheduleResult[0].schedule[3].run_at
      );
      expect(events[3]?.kibana?.alert?.rule?.execution?.backfill?.interval).to.eql(
        scheduleResult[0].schedule[3].interval
      );

      // task should have been deleted after backfill runs have finished
      const numHits = await searchScheduledTask(backfillId);
      expect(numHits).to.eql(0);
    });

    async function indexTestDocs() {
      await asyncForEach(originalDocTimestamps, async (timestamp: string) => {
        await createEsDocument(es, new Date(timestamp).valueOf(), 1, ES_TEST_INDEX_NAME);
      });

      await esTestIndexTool.waitForDocs(
        DOCUMENT_SOURCE,
        DOCUMENT_REFERENCE,
        originalDocTimestamps.length
      );
    }
  });

  async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
      body: { query: { match_all: {} } },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
  }

  async function waitForEventLogDocs(
    id: string,
    spaceId: string,
    actions: Map<string, { gte: number } | { equal: number }>
  ) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId,
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        id,
        provider: 'alerting',
        actions,
      });
    });
  }

  async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
    const scheduledTask = await es.get<TaskManagerDoc>({
      id: `task:${id}`,
      index: '.kibana_task_manager',
    });
    return scheduledTask._source!;
  }

  async function searchScheduledTask(id: string) {
    const searchResult = await es.search({
      index: '.kibana_task_manager',
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'task.id': `task:${id}`,
                },
              },
              {
                terms: {
                  'task.scope': ['alerting'],
                },
              },
            ],
          },
        },
      },
    });

    // @ts-expect-error
    return searchResult.hits.total.value;
  }
}
