/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  ALERT_CONSECUTIVE_MATCHES,
} from '@kbn/rule-data-utils';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ES_TEST_INDEX_NAME, ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../scenarios';
import {
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
  TaskManagerDoc,
} from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createAlertsAsDataAlertDelayInstallResourcesTest({
  getService,
}: FtrProviderContext) {
  const ACTIVE_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.active';
  const NEW_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.new';
  const RECOVERED_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.recovered';
  const ACTION_PATH = 'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
  const UUID_PATH = 'kibana.alert.rule.execution.uuid';
  const DELAYED_PATH = 'kibana.alert.rule.execution.metrics.number_of_delayed_alerts';

  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  type PatternFiringAlert = Alert & { patternIndex: number; instancePattern: boolean[] };
  // type AlwaysFiringAlert = Alert & { patternIndex: number; instancePattern: boolean[] };

  const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';
  const alwaysFiringAlertsAsDataIndex =
    '.internal.alerts-observability.test.alerts.alerts-default-000001';
  const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

  describe('alerts as data', () => {
    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.deleteByQuery({
        index: [alertsAsDataIndex, alwaysFiringAlertsAsDataIndex],
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await es.deleteByQuery({
        index: [alertsAsDataIndex, alwaysFiringAlertsAsDataIndex],
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    it('should generate expected events with a alertDelay with AAD', async () => {
      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      // pattern of when the alert should fire
      const pattern = {
        instance: [true, true, true, true, false, true],
      };

      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAad',
            schedule: { interval: '1d' },
            throttle: null,
            notify_when: null,
            params: {
              pattern,
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
                frequency: {
                  summary: false,
                  throttle: null,
                  notify_when: RuleNotifyWhen.CHANGE,
                },
              },
            ],
            alert_delay: {
              active: 3,
            },
          })
        );

      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // --------------------------
      // RUN 1 - 0 new alerts
      // --------------------------
      let events: IValidatedEvent[] = await waitForEventLogDocs(
        ruleId,
        new Map([['execute', { equal: 1 }]])
      );
      let executeEvent = events[0];
      expect(get(executeEvent, ACTIVE_PATH)).to.be(0);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(1);

      // Query for alerts
      const alertDocsRun1 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      let state: any = await getTaskState(ruleId);
      expect(state.alertInstances.instance.meta.activeCount).to.equal(1);
      expect(state.alertInstances.instance.state.patternIndex).to.equal(0);

      // After the first run, we should have 0 alert docs for the 0 active alerts
      expect(alertDocsRun1.length).to.equal(0);

      // --------------------------
      // RUN 2 - 0 new alerts
      // --------------------------
      let runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 2 }]]));
      executeEvent = events[1];
      expect(get(executeEvent, ACTIVE_PATH)).to.be(0);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(1);

      // Query for alerts
      const alertDocsRun2 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances.instance.meta.activeCount).to.equal(2);
      expect(state.alertInstances.instance.state.patternIndex).to.equal(1);

      // After the second run, we should have 0 alert docs for the 0 active alerts
      expect(alertDocsRun2.length).to.equal(0);

      // --------------------------
      // RUN 3 - 1 new alert
      // --------------------------
      runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 3 }]]));
      executeEvent = events[2];
      let executionUuid = get(executeEvent, UUID_PATH);
      expect(get(executeEvent, ACTIVE_PATH)).to.be(1);
      expect(get(executeEvent, NEW_PATH)).to.be(1);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(1);
      expect(get(executeEvent, DELAYED_PATH)).to.be(0);

      // Query for alerts
      const alertDocsRun3 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances.instance.meta.activeCount).to.equal(3);
      expect(state.alertInstances.instance.state.patternIndex).to.equal(2);

      // After the third run, we should have 1 alert docs for the 1 active alert
      expect(alertDocsRun3.length).to.equal(1);

      testExpectRuleData(alertDocsRun3, ruleId, { pattern }, executionUuid!);
      let source: PatternFiringAlert = alertDocsRun3[0]._source!;

      // Each doc should have active status and default action group id
      expect(source[ALERT_ACTION_GROUP]).to.equal('default');
      // patternIndex should be 2 for the third run
      expect(source.patternIndex).to.equal(2);
      // alert UUID should equal doc id
      expect(source[ALERT_UUID]).to.equal(alertDocsRun3[0]._id);
      // duration should be 0 since this is a new alert
      expect(source[ALERT_DURATION]).to.equal(0);
      // start should be defined
      expect(source[ALERT_START]).to.match(timestampPattern);
      // time_range.gte should be same as start
      expect(source[ALERT_TIME_RANGE]?.gte).to.equal(source[ALERT_START]);
      // timestamp should be defined
      expect(source['@timestamp']).to.match(timestampPattern);
      // status should be active
      expect(source[ALERT_STATUS]).to.equal('active');
      // workflow status should be 'open'
      expect(source[ALERT_WORKFLOW_STATUS]).to.equal('open');
      // event.action should be 'open'
      expect(source[EVENT_ACTION]).to.equal('open');
      // event.kind should be 'signal'
      expect(source[EVENT_KIND]).to.equal('signal');
      // tags should equal rule tags because rule type doesn't set any tags
      expect(source.tags).to.eql(['foo']);
      // alert consecutive matches should match the active count
      expect(source[ALERT_CONSECUTIVE_MATCHES]).to.equal(3);

      // --------------------------
      // RUN 4 - 1 active alert
      // --------------------------
      runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 4 }]]));
      executeEvent = events[3];
      executionUuid = get(executeEvent, UUID_PATH);
      expect(get(executeEvent, ACTIVE_PATH)).to.be(1);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(0);

      // Query for alerts
      const alertDocsRun4 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances.instance.meta.activeCount).to.equal(4);
      expect(state.alertInstances.instance.state.patternIndex).to.equal(3);

      // After the fourth run, we should have 1 alert docs for the 1 active alert
      expect(alertDocsRun4.length).to.equal(1);

      testExpectRuleData(alertDocsRun4, ruleId, { pattern }, executionUuid!);
      source = alertDocsRun4[0]._source!;
      const run3Source = alertDocsRun3[0]._source!;

      expect(source[ALERT_UUID]).to.equal(run3Source[ALERT_UUID]);
      // patternIndex should be 3 for the fourth run
      expect(source.patternIndex).to.equal(3);
      expect(source[ALERT_ACTION_GROUP]).to.equal('default');
      // start time should be defined and the same as prior run
      expect(source[ALERT_START]).to.match(timestampPattern);
      expect(source[ALERT_START]).to.equal(run3Source[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(source['@timestamp']).to.match(timestampPattern);
      expect(source['@timestamp']).not.to.equal(run3Source['@timestamp']);
      // status should still be active
      expect(source[ALERT_STATUS]).to.equal('active');
      // event.action set to active
      expect(source[EVENT_ACTION]).to.eql('active');
      expect(source.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(source[EVENT_KIND]).to.eql(run3Source[EVENT_KIND]);
      expect(source[ALERT_WORKFLOW_STATUS]).to.eql(run3Source[ALERT_WORKFLOW_STATUS]);
      expect(source[ALERT_TIME_RANGE]?.gte).to.equal(run3Source[ALERT_TIME_RANGE]?.gte);
      // alert consecutive matches should match the active count
      expect(source[ALERT_CONSECUTIVE_MATCHES]).to.equal(4);

      // --------------------------
      // RUN 5 - 1 recovered alert
      // --------------------------
      runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 5 }]]));
      executeEvent = events[4];
      executionUuid = get(executeEvent, UUID_PATH);
      expect(get(executeEvent, ACTIVE_PATH)).to.be(0);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(1);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(0);

      // Query for alerts
      const alertDocsRun5 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertRecoveredInstances.instance.meta.activeCount).to.equal(0);

      // After the fourth run, we should have 1 alert docs for the 1 recovered alert
      expect(alertDocsRun5.length).to.equal(1);

      testExpectRuleData(alertDocsRun5, ruleId, { pattern }, executionUuid!);
      source = alertDocsRun5[0]._source!;

      // action group should be set to recovered
      expect(source[ALERT_ACTION_GROUP]).to.be('recovered');
      // rule type AAD payload should be set to recovery values
      expect(source.instancePattern).to.eql([]);
      expect(source.patternIndex).to.eql(-1);
      // uuid is the same
      expect(source[ALERT_UUID]).to.equal(run3Source[ALERT_UUID]);
      // start time should be defined and the same as before
      expect(source[ALERT_START]).to.match(timestampPattern);
      expect(source[ALERT_START]).to.equal(run3Source[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(source['@timestamp']).to.match(timestampPattern);
      expect(source['@timestamp']).not.to.equal(run3Source['@timestamp']);
      // end time should be defined
      expect(source[ALERT_END]).to.match(timestampPattern);
      // status should be set to recovered
      expect(source[ALERT_STATUS]).to.equal('recovered');
      // event.action set to close
      expect(source[EVENT_ACTION]).to.eql('close');
      expect(source.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(source[EVENT_KIND]).to.eql(run3Source[EVENT_KIND]);
      expect(source[ALERT_WORKFLOW_STATUS]).to.eql(run3Source[ALERT_WORKFLOW_STATUS]);
      expect(source[ALERT_TIME_RANGE]?.gte).to.equal(run3Source[ALERT_TIME_RANGE]?.gte);
      // time_range.lte should be set to end time
      expect(source[ALERT_TIME_RANGE]?.lte).to.equal(source[ALERT_END]);
      // alert consecutive matches should match the active count
      expect(source[ALERT_CONSECUTIVE_MATCHES]).to.equal(0);

      // --------------------------
      // RUN 6 - 0 new alerts
      // --------------------------
      runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 6 }]]));
      executeEvent = events[5];
      expect(get(executeEvent, ACTIVE_PATH)).to.be(0);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(1);

      // Query for alerts
      const alertDocsRun6 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances.instance.meta.activeCount).to.equal(1);
      expect(state.alertInstances.instance.state.patternIndex).to.equal(5);

      // After the sixth run, we should have 1 alert docs for the previously recovered alert
      expect(alertDocsRun6.length).to.equal(1);
    });

    it('should generate expected events with a alertDelay with AAD (rule registry)', async () => {
      const params = {
        index: ES_TEST_INDEX_NAME,
        reference: 'test',
      };
      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '1d' },
            throttle: null,
            notify_when: null,
            params,
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
                frequency: {
                  summary: false,
                  throttle: null,
                  notify_when: RuleNotifyWhen.CHANGE,
                },
              },
            ],
            alert_delay: {
              active: 3,
            },
          })
        );

      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // --------------------------
      // RUN 1 - 0 new alerts
      // --------------------------
      let events: IValidatedEvent[] = await waitForEventLogDocs(
        ruleId,
        new Map([['execute', { equal: 1 }]])
      );
      let executeEvent = events[0];
      expect(get(executeEvent, ACTIVE_PATH)).to.be(0);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(2);

      // Query for alerts
      const alertDocsRun1 = await queryForAlertDocs<Alert>(alwaysFiringAlertsAsDataIndex);

      // Get alert state from task document
      let state: any = await getTaskState(ruleId);
      expect(state.alertInstances['1'].meta.activeCount).to.equal(1);
      expect(state.alertTypeState.trackedAlerts['1'].activeCount).to.equal(1);

      // After the first run, we should have 0 alert docs for the 0 active alerts
      expect(alertDocsRun1.length).to.equal(0);

      // --------------------------
      // RUN 2 - 0 new alerts
      // --------------------------
      let runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 2 }]]));
      executeEvent = events[1];
      expect(get(executeEvent, ACTIVE_PATH)).to.be(0);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(2);

      // Query for alerts
      const alertDocsRun2 = await queryForAlertDocs<Alert>(alwaysFiringAlertsAsDataIndex);

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances['1'].meta.activeCount).to.equal(2);
      expect(state.alertTypeState.trackedAlerts['1'].activeCount).to.equal(2);

      // After the second run, we should have 0 alert docs for the 0 active alerts
      expect(alertDocsRun2.length).to.equal(0);

      // --------------------------
      // RUN 3 - 1 new alert
      // --------------------------
      runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 3 }]]));
      executeEvent = events[2];
      let executionUuid = get(executeEvent, UUID_PATH);
      // Note: the rule creates 2 alerts but we will only look at one
      expect(get(executeEvent, ACTIVE_PATH)).to.be(2);
      expect(get(executeEvent, NEW_PATH)).to.be(2);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(2);
      expect(get(executeEvent, DELAYED_PATH)).to.be(0);

      // Query for alerts
      const alertDocsRun3 = await queryForAlertDocs<Alert>(alwaysFiringAlertsAsDataIndex);

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances['1'].meta.activeCount).to.equal(3);
      expect(state.alertTypeState.trackedAlerts['1'].activeCount).to.equal(3);

      // After the third run, we should have 2 alert docs for the 2 active alerts but we will only look at one
      expect(alertDocsRun3.length).to.equal(2);

      let source: Alert = alertDocsRun3[0]._source!;

      // Each doc should have a copy of the rule data
      expect(source[ALERT_RULE_CATEGORY]).to.equal('Test: Always Firing Alert As Data');
      expect(source[ALERT_RULE_CONSUMER]).to.equal('alertsFixture');
      expect(source[ALERT_RULE_NAME]).to.equal('abc');
      expect(source[ALERT_RULE_PRODUCER]).to.equal('alertsFixture');
      expect(source[ALERT_RULE_TAGS]).to.eql(['foo']);
      expect(source[ALERT_RULE_TYPE_ID]).to.equal('test.always-firing-alert-as-data');
      expect(source[ALERT_RULE_UUID]).to.equal(ruleId);
      expect(source[ALERT_RULE_PARAMETERS]).to.eql(params);
      expect(source[SPACE_IDS]).to.eql(['space1']);
      expect(source[ALERT_RULE_EXECUTION_UUID]).to.equal(executionUuid);
      // alert UUID should equal doc id
      expect(source[ALERT_UUID]).to.equal(alertDocsRun3[0]._id);
      // duration should be 0 since this is a new alert
      expect(source[ALERT_DURATION]).to.equal(0);
      // start should be defined
      expect(source[ALERT_START]).to.match(timestampPattern);
      // time_range.gte should be same as start
      expect(source[ALERT_TIME_RANGE]?.gte).to.equal(source[ALERT_START]);
      // timestamp should be defined
      expect(source['@timestamp']).to.match(timestampPattern);
      // status should be active
      expect(source[ALERT_STATUS]).to.equal('active');
      // workflow status should be 'open'
      expect(source[ALERT_WORKFLOW_STATUS]).to.equal('open');
      // event.action should be 'open'
      expect(source[EVENT_ACTION]).to.equal('open');
      // event.kind should be 'signal'
      expect(source[EVENT_KIND]).to.equal('signal');
      // tags should equal rule tags because rule type doesn't set any tags
      expect(source.tags).to.eql(['foo']);
      // alert consecutive matches should match the active count
      expect(source[ALERT_CONSECUTIVE_MATCHES]).to.equal(3);

      // --------------------------
      // RUN 4 - 1 active alert
      // --------------------------
      runSoon = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoon.status).to.eql(204);

      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 4 }]]));
      executeEvent = events[3];
      executionUuid = get(executeEvent, UUID_PATH);
      // Note: the rule creates 2 alerts but we will only look at one
      expect(get(executeEvent, ACTIVE_PATH)).to.be(2);
      expect(get(executeEvent, NEW_PATH)).to.be(0);
      expect(get(executeEvent, RECOVERED_PATH)).to.be(0);
      expect(get(executeEvent, ACTION_PATH)).to.be(0);
      expect(get(executeEvent, DELAYED_PATH)).to.be(0);

      // Query for alerts
      const alertDocsRun4 = await queryForAlertDocs<Alert>(alwaysFiringAlertsAsDataIndex);

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances['1'].meta.activeCount).to.equal(4);
      expect(state.alertTypeState.trackedAlerts['1'].activeCount).to.equal(4);

      // After the fourth run, we should have 2 alert docs for the 2 active alerts but we will only look at one
      expect(alertDocsRun4.length).to.equal(2);

      source = alertDocsRun4[0]._source!;
      const run3Source = alertDocsRun3[0]._source!;

      // Each doc should have a copy of the rule data
      expect(source[ALERT_RULE_CATEGORY]).to.equal('Test: Always Firing Alert As Data');
      expect(source[ALERT_RULE_CONSUMER]).to.equal('alertsFixture');
      expect(source[ALERT_RULE_NAME]).to.equal('abc');
      expect(source[ALERT_RULE_PRODUCER]).to.equal('alertsFixture');
      expect(source[ALERT_RULE_TAGS]).to.eql(['foo']);
      expect(source[ALERT_RULE_TYPE_ID]).to.equal('test.always-firing-alert-as-data');
      expect(source[ALERT_RULE_UUID]).to.equal(ruleId);
      expect(source[ALERT_RULE_PARAMETERS]).to.eql(params);
      expect(source[SPACE_IDS]).to.eql(['space1']);
      expect(source[ALERT_RULE_EXECUTION_UUID]).to.equal(executionUuid);
      expect(source[ALERT_UUID]).to.equal(run3Source[ALERT_UUID]);
      // start time should be defined and the same as prior run
      expect(source[ALERT_START]).to.match(timestampPattern);
      expect(source[ALERT_START]).to.equal(run3Source[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(source['@timestamp']).to.match(timestampPattern);
      expect(source['@timestamp']).not.to.equal(run3Source['@timestamp']);
      // status should still be active
      expect(source[ALERT_STATUS]).to.equal('active');
      // event.action set to active
      expect(source[EVENT_ACTION]).to.eql('active');
      expect(source.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(source[EVENT_KIND]).to.eql(run3Source[EVENT_KIND]);
      expect(source[ALERT_WORKFLOW_STATUS]).to.eql(run3Source[ALERT_WORKFLOW_STATUS]);
      expect(source[ALERT_TIME_RANGE]?.gte).to.equal(run3Source[ALERT_TIME_RANGE]?.gte);
      // alert consecutive matches should match the active count
      expect(source[ALERT_CONSECUTIVE_MATCHES]).to.equal(4);
    });
  });

  function testExpectRuleData(
    alertDocs: Array<SearchHit<PatternFiringAlert>>,
    ruleId: string,
    ruleParameters: unknown,
    executionUuid?: string
  ) {
    for (let i = 0; i < alertDocs.length; ++i) {
      const source: PatternFiringAlert = alertDocs[i]._source!;

      // Each doc should have a copy of the rule data
      expect(source[ALERT_RULE_CATEGORY]).to.equal(
        'Test: Firing on a Pattern and writing Alerts as Data'
      );
      expect(source[ALERT_RULE_CONSUMER]).to.equal('alertsFixture');
      expect(source[ALERT_RULE_NAME]).to.equal('abc');
      expect(source[ALERT_RULE_PRODUCER]).to.equal('alertsFixture');
      expect(source[ALERT_RULE_TAGS]).to.eql(['foo']);
      expect(source[ALERT_RULE_TYPE_ID]).to.equal('test.patternFiringAad');
      expect(source[ALERT_RULE_UUID]).to.equal(ruleId);
      expect(source[ALERT_RULE_PARAMETERS]).to.eql(ruleParameters);
      expect(source[SPACE_IDS]).to.eql(['space1']);

      if (executionUuid) {
        expect(source[ALERT_RULE_EXECUTION_UUID]).to.equal(executionUuid);
      }
    }
  }

  async function queryForAlertDocs<T>(
    index: string = alertsAsDataIndex
  ): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index,
      body: { query: { match_all: {} } },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
  }

  async function getTaskState(ruleId: string) {
    const task = await es.get<TaskManagerDoc>({
      id: `task:${ruleId}`,
      index: '.kibana_task_manager',
    });

    return JSON.parse(task._source!.task.state);
  }

  async function waitForEventLogDocs(
    id: string,
    actions: Map<string, { gte: number } | { equal: number }>
  ) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions,
      });
    });
  }
}
