/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { omit } from 'lodash';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_SEVERITY_IMPROVING,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_TIMESTAMP,
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
} from '@kbn/rule-data-utils';
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
export default function createAlertsAsDataInstallResourcesTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);

  type PatternFiringAlert = Alert & { patternIndex: number; instancePattern: boolean[] };

  const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';
  const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
  const fieldsToOmitInComparison = [
    '@timestamp',
    'kibana.alert.flapping_history',
    'kibana.alert.rule.execution.uuid',
    'kibana.alert.rule.execution.timestamp',
    'kibana.alert.severity_improving',
    'kibana.alert.previous_action_group',
  ];

  describe('alerts as data', () => {
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    it('should write alert docs during rule execution', async () => {
      const pattern = {
        alertA: [true, true, true], // stays active across executions
        alertB: [true, false, false], // active then recovers
        alertC: [true, false, true], // active twice
      };
      const ruleParameters = { pattern };
      const createdRule = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAad',
            // set the schedule long so we can use "runSoon" to specify rule runs
            schedule: { interval: '1d' },
            throttle: null,
            params: ruleParameters,
            actions: [],
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // --------------------------
      // RUN 1 - 3 new alerts
      // --------------------------
      // Wait for the event log execute doc so we can get the execution UUID
      let events: IValidatedEvent[] = await waitForEventLogDocs(
        ruleId,
        new Map([['execute', { equal: 1 }]])
      );
      let executeEvent = events[0];
      let executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Query for alerts
      const alertDocsRun1 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      let state: any = await getTaskState(ruleId);
      expect(state.alertInstances.alertA.state.patternIndex).to.equal(0);
      expect(state.alertInstances.alertB.state.patternIndex).to.equal(0);
      expect(state.alertInstances.alertC.state.patternIndex).to.equal(0);

      // After the first run, we should have 3 alert docs for the 3 active alerts
      expect(alertDocsRun1.length).to.equal(3);

      testExpectRuleData(alertDocsRun1, ruleId, ruleParameters, executionUuid!);
      for (let i = 0; i < alertDocsRun1.length; ++i) {
        const source: PatternFiringAlert = alertDocsRun1[i]._source!;

        // Each doc should have active status and default action group id
        expect(source[ALERT_ACTION_GROUP]).to.equal('default');

        // patternIndex should be 0 for the first run
        expect(source.patternIndex).to.equal(0);

        // alert UUID should equal doc id
        expect(source[ALERT_UUID]).to.equal(alertDocsRun1[i]._id);

        // duration should be 0 since this is a new alert
        expect(source[ALERT_DURATION]).to.equal(0);

        // start should be defined
        expect(source[ALERT_START]).to.match(timestampPattern);

        // time_range.gte should be same as start
        expect(source[ALERT_TIME_RANGE]?.gte).to.equal(source[ALERT_START]);

        // timestamp should be defined
        expect(source['@timestamp']).to.match(timestampPattern);

        // execution time should be same as timestamp
        expect(source[ALERT_RULE_EXECUTION_TIMESTAMP]).to.equal(source['@timestamp']);

        // status should be active
        expect(source[ALERT_STATUS]).to.equal('active');

        // flapping information for new alert
        expect(source[ALERT_FLAPPING]).to.equal(false);
        expect(source[ALERT_FLAPPING_HISTORY]).to.eql([true]);

        // workflow status should be 'open'
        expect(source[ALERT_WORKFLOW_STATUS]).to.equal('open');

        // event.action should be 'open'
        expect(source[EVENT_ACTION]).to.equal('open');

        // event.kind should be 'signal'
        expect(source[EVENT_KIND]).to.equal('signal');

        // tags should equal rule tags because rule type doesn't set any tags
        expect(source.tags).to.eql(['foo']);

        // new alerts automatically get severity_improving set to false
        expect(source[ALERT_SEVERITY_IMPROVING]).to.equal(false);
      }

      let alertDoc: SearchHit<PatternFiringAlert> | undefined = alertDocsRun1.find(
        (doc) => doc._source![ALERT_INSTANCE_ID] === 'alertA'
      );
      const alertADocRun1 = alertDoc!._source!;
      expect(alertADocRun1.instancePattern).to.eql(pattern.alertA);

      alertDoc = alertDocsRun1.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertB');
      const alertBDocRun1 = alertDoc!._source!;
      expect(alertBDocRun1.instancePattern).to.eql(pattern.alertB);

      alertDoc = alertDocsRun1.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertC');
      const alertCDocRun1 = alertDoc!._source!;
      expect(alertCDocRun1.instancePattern).to.eql(pattern.alertC);

      // --------------------------
      // RUN 2 - 2 recovered (alertB, alertC), 1 ongoing (alertA)
      // --------------------------
      let response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);

      // Wait for the event log execute doc so we can get the execution UUID
      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 2 }]]));
      executeEvent = events[1];
      executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Query for alerts
      const alertDocsRun2 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances.alertA.state.patternIndex).to.equal(1);
      expect(state.alertInstances.alertB).to.be(undefined);
      expect(state.alertInstances.alertC).to.be(undefined);

      // After the second run, we should have 3 alert docs
      expect(alertDocsRun2.length).to.equal(3);

      testExpectRuleData(alertDocsRun2, ruleId, ruleParameters, executionUuid!);
      for (let i = 0; i < alertDocsRun2.length; ++i) {
        const source: PatternFiringAlert = alertDocsRun2[i]._source!;

        // alert UUID should equal doc id
        expect(source[ALERT_UUID]).to.equal(alertDocsRun2[i]._id);

        // duration should be greater than 0 since these are not new alerts
        expect(source[ALERT_DURATION]).to.be.greaterThan(0);
      }

      // alertA, run2
      // status is still active; duration is updated; no end time
      alertDoc = alertDocsRun2.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertA');
      const alertADocRun2 = alertDoc!._source!;
      expect(alertADocRun2.instancePattern).to.eql(pattern.alertA);
      // uuid is the same
      expect(alertADocRun2[ALERT_UUID]).to.equal(alertADocRun1[ALERT_UUID]);
      // patternIndex should be 1 for the second run
      expect(alertADocRun2.patternIndex).to.equal(1);
      expect(alertADocRun2[ALERT_ACTION_GROUP]).to.equal('default');
      // start time should be defined and the same as prior run
      expect(alertADocRun2[ALERT_START]).to.match(timestampPattern);
      expect(alertADocRun2[ALERT_START]).to.equal(alertADocRun1[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(alertADocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertADocRun2['@timestamp']).not.to.equal(alertADocRun1['@timestamp']);
      // execution time should be same as timestamp
      expect(alertADocRun2[ALERT_RULE_EXECUTION_TIMESTAMP]).to.equal(alertADocRun2['@timestamp']);
      // status should still be active
      expect(alertADocRun2[ALERT_STATUS]).to.equal('active');
      // flapping false, flapping history updated with additional entry
      expect(alertADocRun2[ALERT_FLAPPING]).to.equal(false);
      expect(alertADocRun2[ALERT_FLAPPING_HISTORY]).to.eql([
        ...alertADocRun1[ALERT_FLAPPING_HISTORY]!,
        false,
      ]);
      // event.action set to active
      expect(alertADocRun2[EVENT_ACTION]).to.eql('active');
      expect(alertADocRun2.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertADocRun2[EVENT_KIND]).to.eql(alertADocRun1[EVENT_KIND]);
      expect(alertADocRun2[ALERT_WORKFLOW_STATUS]).to.eql(alertADocRun1[ALERT_WORKFLOW_STATUS]);
      expect(alertADocRun2[ALERT_TIME_RANGE]?.gte).to.equal(alertADocRun1[ALERT_TIME_RANGE]?.gte);

      // no severity levels for this rule type
      expect(alertADocRun2[ALERT_SEVERITY_IMPROVING]).to.be(undefined);
      expect(alertADocRun2[ALERT_PREVIOUS_ACTION_GROUP]).to.equal('default');

      // alertB, run 2
      // status is updated to recovered, duration is updated, end time is set
      alertDoc = alertDocsRun2.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertB');
      const alertBDocRun2 = alertDoc!._source!;
      // action group should be set to recovered
      expect(alertBDocRun2[ALERT_ACTION_GROUP]).to.be('recovered');
      // rule type AAD payload should be set to recovery values
      expect(alertBDocRun2.instancePattern).to.eql([]);
      expect(alertBDocRun2.patternIndex).to.eql(-1);
      // uuid is the same
      expect(alertBDocRun2[ALERT_UUID]).to.equal(alertBDocRun1[ALERT_UUID]);
      // start time should be defined and the same as before
      expect(alertBDocRun2[ALERT_START]).to.match(timestampPattern);
      expect(alertBDocRun2[ALERT_START]).to.equal(alertBDocRun1[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(alertBDocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertBDocRun2['@timestamp']).not.to.equal(alertBDocRun1['@timestamp']);
      // execution time should be same as timestamp
      expect(alertBDocRun2[ALERT_RULE_EXECUTION_TIMESTAMP]).to.equal(alertBDocRun2['@timestamp']);
      // end time should be defined
      expect(alertBDocRun2[ALERT_END]).to.match(timestampPattern);
      // status should be set to recovered
      expect(alertBDocRun2[ALERT_STATUS]).to.equal('recovered');
      // flapping false, flapping history updated with additional entry
      expect(alertBDocRun2[ALERT_FLAPPING]).to.equal(false);
      expect(alertBDocRun2[ALERT_FLAPPING_HISTORY]).to.eql([
        ...alertBDocRun1[ALERT_FLAPPING_HISTORY]!,
        true,
      ]);
      // event.action set to close
      expect(alertBDocRun2[EVENT_ACTION]).to.eql('close');
      expect(alertBDocRun2.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertBDocRun2[EVENT_KIND]).to.eql(alertBDocRun1[EVENT_KIND]);
      expect(alertBDocRun2[ALERT_WORKFLOW_STATUS]).to.eql(alertBDocRun1[ALERT_WORKFLOW_STATUS]);
      expect(alertBDocRun2[ALERT_TIME_RANGE]?.gte).to.equal(alertBDocRun1[ALERT_TIME_RANGE]?.gte);
      // time_range.lte should be set to end time
      expect(alertBDocRun2[ALERT_TIME_RANGE]?.lte).to.equal(alertBDocRun2[ALERT_END]);

      // recovered alerts automatically get severity_improving set to true
      expect(alertBDocRun2[ALERT_SEVERITY_IMPROVING]).to.equal(true);
      expect(alertBDocRun2[ALERT_PREVIOUS_ACTION_GROUP]).to.equal('default');

      // alertC, run 2
      // status is updated to recovered, duration is updated, end time is set
      alertDoc = alertDocsRun2.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertC');
      const alertCDocRun2 = alertDoc!._source!;
      // action group should be set to recovered
      expect(alertCDocRun2[ALERT_ACTION_GROUP]).to.be('recovered');
      // rule type AAD payload should be set to recovery values
      expect(alertCDocRun2.instancePattern).to.eql([]);
      expect(alertCDocRun2.patternIndex).to.eql(-1);
      // uuid is the same
      expect(alertCDocRun2[ALERT_UUID]).to.equal(alertCDocRun1[ALERT_UUID]);
      // start time should be defined and the same as before
      expect(alertCDocRun2[ALERT_START]).to.match(timestampPattern);
      expect(alertCDocRun2[ALERT_START]).to.equal(alertCDocRun1[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(alertCDocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertCDocRun2['@timestamp']).not.to.equal(alertCDocRun1['@timestamp']);
      // execution time should be same as timestamp
      expect(alertCDocRun2[ALERT_RULE_EXECUTION_TIMESTAMP]).to.equal(alertCDocRun2['@timestamp']);
      // end time should be defined
      expect(alertCDocRun2[ALERT_END]).to.match(timestampPattern);
      // status should be set to recovered
      expect(alertCDocRun2[ALERT_STATUS]).to.equal('recovered');
      // flapping false, flapping history updated with additional entry
      expect(alertCDocRun2[ALERT_FLAPPING]).to.equal(false);
      expect(alertCDocRun2[ALERT_FLAPPING_HISTORY]).to.eql([
        ...alertCDocRun1[ALERT_FLAPPING_HISTORY]!,
        true,
      ]);
      // event.action set to close
      expect(alertCDocRun2[EVENT_ACTION]).to.eql('close');
      expect(alertCDocRun2.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertCDocRun2[EVENT_KIND]).to.eql(alertADocRun1[EVENT_KIND]);
      expect(alertCDocRun2[ALERT_WORKFLOW_STATUS]).to.eql(alertCDocRun1[ALERT_WORKFLOW_STATUS]);
      expect(alertCDocRun2[ALERT_TIME_RANGE]?.gte).to.equal(alertCDocRun1[ALERT_TIME_RANGE]?.gte);
      // time_range.lte should be set to end time
      expect(alertCDocRun2[ALERT_TIME_RANGE]?.lte).to.equal(alertCDocRun2[ALERT_END]);

      // recovered alerts automatically get severity_improving set to true
      expect(alertBDocRun2[ALERT_SEVERITY_IMPROVING]).to.equal(true);
      expect(alertCDocRun2[ALERT_PREVIOUS_ACTION_GROUP]).to.equal('default');

      // --------------------------
      // RUN 3 - 1 re-active (alertC), 1 still recovered (alertB), 1 ongoing (alertA)
      // --------------------------
      response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);

      // Wait for the event log execute doc so we can get the execution UUID
      events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 3 }]]));
      executeEvent = events[2];
      executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Query for alerts
      const alertDocsRun3 = await queryForAlertDocs<PatternFiringAlert>();

      // Get alert state from task document
      state = await getTaskState(ruleId);
      expect(state.alertInstances.alertA.state.patternIndex).to.equal(2);
      expect(state.alertInstances.alertB).to.be(undefined);
      expect(state.alertInstances.alertC.state.patternIndex).to.equal(2);

      // After the third run, we should have 4 alert docs
      // The docs for "alertA" and "alertB" should not have been updated
      // There should be two docs for "alertC", one for the first active -> recovered span
      // the second for the new active span
      expect(alertDocsRun3.length).to.equal(4);

      testExpectRuleData(alertDocsRun3, ruleId, ruleParameters);

      // alertA, run3
      // status is still active; duration is updated; no end time
      alertDoc = alertDocsRun3.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertA');
      const alertADocRun3 = alertDoc!._source!;
      expect(alertADocRun3.instancePattern).to.eql(pattern.alertA);
      // uuid is the same as previous runs
      expect(alertADocRun3[ALERT_UUID]).to.equal(alertADocRun2[ALERT_UUID]);
      expect(alertADocRun3[ALERT_UUID]).to.equal(alertADocRun1[ALERT_UUID]);
      // patternIndex should be 2 for the third run
      expect(alertADocRun3.patternIndex).to.equal(2);
      expect(alertADocRun3[ALERT_ACTION_GROUP]).to.equal('default');
      // start time should be defined and the same as prior runs
      expect(alertADocRun3[ALERT_START]).to.match(timestampPattern);
      expect(alertADocRun3[ALERT_START]).to.equal(alertADocRun2[ALERT_START]);
      expect(alertADocRun3[ALERT_START]).to.equal(alertADocRun1[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(alertADocRun3['@timestamp']).to.match(timestampPattern);
      expect(alertADocRun3['@timestamp']).not.to.equal(alertADocRun2['@timestamp']);
      // execution time should be same as timestamp
      expect(alertADocRun3[ALERT_RULE_EXECUTION_TIMESTAMP]).to.equal(alertADocRun3['@timestamp']);
      // status should still be active
      expect(alertADocRun3[ALERT_STATUS]).to.equal('active');
      // flapping false, flapping history updated with additional entry
      expect(alertADocRun3[ALERT_FLAPPING]).to.equal(false);
      expect(alertADocRun3[ALERT_FLAPPING_HISTORY]).to.eql([
        ...alertADocRun2[ALERT_FLAPPING_HISTORY]!,
        false,
      ]);
      // event.action should still to active
      expect(alertADocRun3[EVENT_ACTION]).to.eql('active');
      expect(alertADocRun3.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertADocRun3[EVENT_KIND]).to.eql(alertADocRun2[EVENT_KIND]);
      expect(alertADocRun3[ALERT_WORKFLOW_STATUS]).to.eql(alertADocRun2[ALERT_WORKFLOW_STATUS]);
      expect(alertADocRun3[ALERT_TIME_RANGE]?.gte).to.equal(alertADocRun2[ALERT_TIME_RANGE]?.gte);

      // no severity levels for this rule type
      expect(alertADocRun3[ALERT_SEVERITY_IMPROVING]).to.be(undefined);
      expect(alertADocRun3[ALERT_PREVIOUS_ACTION_GROUP]).to.equal('default');

      // alertB doc should be unchanged from prior run because it is still recovered
      // but its flapping history should be updated
      alertDoc = alertDocsRun3.find((doc) => doc._source![ALERT_INSTANCE_ID] === 'alertB');
      const alertBDocRun3 = alertDoc!._source!;
      expect(omit(alertBDocRun3, fieldsToOmitInComparison)).to.eql(
        omit(alertBDocRun2, fieldsToOmitInComparison)
      );

      // execution uuid should be overwritten
      expect(alertBDocRun3[ALERT_RULE_EXECUTION_UUID]).to.eql(
        alertBDocRun2[ALERT_RULE_EXECUTION_UUID]
      );

      // flapping history should be history from prior run with additional entry
      expect(alertBDocRun3[ALERT_FLAPPING_HISTORY]).to.eql([
        ...alertBDocRun2[ALERT_FLAPPING_HISTORY]!,
        false,
      ]);

      expect(alertBDocRun3[ALERT_SEVERITY_IMPROVING]).to.be(undefined);
      expect(alertBDocRun3[ALERT_PREVIOUS_ACTION_GROUP]).to.equal('recovered');

      // alertC should have 2 docs
      const alertCDocs = alertDocsRun3.filter(
        (doc) => doc._source![ALERT_INSTANCE_ID] === 'alertC'
      );
      // alertC recovered doc should be exactly the same as the alertC doc from prior run
      const recoveredAlertCDoc = alertCDocs.find(
        (doc) => doc._source![ALERT_RULE_EXECUTION_UUID] !== executionUuid
      )!._source!;
      expect(recoveredAlertCDoc).to.eql(alertCDocRun2);

      // alertC doc from current execution
      const alertCDocRun3 = alertCDocs.find(
        (doc) => doc._source![ALERT_RULE_EXECUTION_UUID] === executionUuid
      )!._source!;
      expect(alertCDocRun3.instancePattern).to.eql(pattern.alertC);
      // uuid is the different from prior run]
      expect(alertCDocRun3[ALERT_UUID]).not.to.equal(alertCDocRun2[ALERT_UUID]);
      expect(alertCDocRun3[ALERT_ACTION_GROUP]).to.equal('default');
      // patternIndex should be 2 for the third run
      expect(alertCDocRun3.patternIndex).to.equal(2);
      // start time should be defined and different from the prior run
      expect(alertCDocRun3[ALERT_START]).to.match(timestampPattern);
      expect(alertCDocRun3[ALERT_START]).not.to.equal(alertCDocRun2[ALERT_START]);
      // timestamp should be defined and not the same as prior run
      expect(alertCDocRun3['@timestamp']).to.match(timestampPattern);
      // execution time should be same as timestamp
      expect(alertCDocRun3[ALERT_RULE_EXECUTION_TIMESTAMP]).to.equal(alertCDocRun3['@timestamp']);
      // duration should be 0 since this is a new alert
      expect(alertCDocRun3[ALERT_DURATION]).to.equal(0);
      // flapping false, flapping history should be history from prior run with additional entry
      expect(alertCDocRun3[ALERT_FLAPPING]).to.equal(false);
      expect(alertCDocRun3[ALERT_FLAPPING_HISTORY]).to.eql([
        ...alertCDocRun2[ALERT_FLAPPING_HISTORY]!,
        true,
      ]);
      // event.action should be 'open'
      expect(alertCDocRun3[EVENT_ACTION]).to.eql('open');
      expect(alertCDocRun3.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertCDocRun3[EVENT_KIND]).to.eql('signal');
      expect(alertCDocRun3[ALERT_WORKFLOW_STATUS]).to.eql('open');
      expect(alertCDocRun3[ALERT_TIME_RANGE]?.gte).to.equal(alertCDocRun3[ALERT_START]);

      // new alerts automatically get severity_improving set to false
      expect(alertCDocRun3[ALERT_SEVERITY_IMPROVING]).to.equal(false);
      expect(alertCDocRun3[ALERT_PREVIOUS_ACTION_GROUP]).to.be(undefined);
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

  async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
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
