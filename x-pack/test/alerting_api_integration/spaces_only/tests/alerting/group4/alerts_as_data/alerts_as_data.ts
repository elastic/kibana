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
  ];

  describe('alerts as data', () => {
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await es.deleteByQuery({ index: alertsAsDataIndex, query: { match_all: {} } });
    });

    it('should write alert docs during rule execution', async () => {
      const pattern = {
        alertA: [true, true, true], // stays active across executions
        alertB: [true, false, false], // active then recovers
        alertC: [true, false, true], // active twice
      };
      const ruleParameters = { pattern, index: 'test-index', reference: 'test-ref' };
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
        expect(source.kibana.alert.action_group).to.equal('default');

        // patternIndex should be 0 for the first run
        expect(source.patternIndex).to.equal(0);

        // alert UUID should equal doc id
        expect(source.kibana.alert.uuid).to.equal(alertDocsRun1[i]._id);

        // duration should be '0' since this is a new alert
        expect(source.kibana.alert.duration?.us).to.equal('0');

        // start should be defined
        expect(source.kibana.alert.start).to.match(timestampPattern);

        // time_range.gte should be same as start
        expect(source.kibana.alert.time_range?.gte).to.equal(source.kibana.alert.start);

        // timestamp should be defined
        expect(source['@timestamp']).to.match(timestampPattern);

        // status should be active
        expect(source.kibana.alert.status).to.equal('active');

        // flapping information for new alert
        expect(source.kibana.alert.flapping).to.equal(false);
        expect(source.kibana.alert.flapping_history).to.eql([true]);

        // workflow status should be 'open'
        expect(source.kibana.alert.workflow_status).to.equal('open');

        // event.action should be 'open'
        expect(source.event?.action).to.equal('open');

        // event.kind should be 'signal'
        expect(source.event?.kind).to.equal('signal');

        // tags should equal rule tags because rule type doesn't set any tags
        expect(source.tags).to.eql(['foo']);
      }

      let alertDoc: SearchHit<PatternFiringAlert> | undefined = alertDocsRun1.find(
        (doc) => doc._source!.kibana.alert.instance.id === 'alertA'
      );
      const alertADocRun1 = alertDoc!._source!;
      expect(alertADocRun1.instancePattern).to.eql(pattern.alertA);

      alertDoc = alertDocsRun1.find((doc) => doc._source!.kibana.alert.instance.id === 'alertB');
      const alertBDocRun1 = alertDoc!._source!;
      expect(alertBDocRun1.instancePattern).to.eql(pattern.alertB);

      alertDoc = alertDocsRun1.find((doc) => doc._source!.kibana.alert.instance.id === 'alertC');
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
        expect(source.kibana.alert.uuid).to.equal(alertDocsRun2[i]._id);

        // duration should be greater than 0 since these are not new alerts
        const durationAsNumber = Number(source.kibana.alert.duration?.us);
        expect(durationAsNumber).to.be.greaterThan(0);
      }

      // alertA, run2
      // status is still active; duration is updated; no end time
      alertDoc = alertDocsRun2.find((doc) => doc._source!.kibana.alert.instance.id === 'alertA');
      const alertADocRun2 = alertDoc!._source!;
      expect(alertADocRun2.instancePattern).to.eql(pattern.alertA);
      // uuid is the same
      expect(alertADocRun2.kibana.alert.uuid).to.equal(alertADocRun1.kibana.alert.uuid);
      // patternIndex should be 1 for the second run
      expect(alertADocRun2.patternIndex).to.equal(1);
      expect(alertADocRun2.kibana.alert.action_group).to.equal('default');
      // start time should be defined and the same as prior run
      expect(alertADocRun2.kibana.alert.start).to.match(timestampPattern);
      expect(alertADocRun2.kibana.alert.start).to.equal(alertADocRun1.kibana.alert.start);
      // timestamp should be defined and not the same as prior run
      expect(alertADocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertADocRun2['@timestamp']).not.to.equal(alertADocRun1['@timestamp']);
      // status should still be active
      expect(alertADocRun2.kibana.alert.status).to.equal('active');
      // flapping false, flapping history updated with additional entry
      expect(alertADocRun2.kibana.alert.flapping).to.equal(false);
      expect(alertADocRun2.kibana.alert.flapping_history).to.eql([
        ...alertADocRun1.kibana.alert.flapping_history!,
        false,
      ]);
      // event.action set to active
      expect(alertADocRun2.event?.action).to.eql('active');
      expect(alertADocRun2.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertADocRun2.event?.kind).to.eql(alertADocRun1.event?.kind);
      expect(alertADocRun2.kibana.alert.workflow_status).to.eql(
        alertADocRun1.kibana.alert.workflow_status
      );
      expect(alertADocRun2.kibana.alert.time_range?.gte).to.equal(
        alertADocRun1.kibana.alert.time_range?.gte
      );

      // alertB, run 2
      // status is updated to recovered, duration is updated, end time is set
      alertDoc = alertDocsRun2.find((doc) => doc._source!.kibana.alert.instance.id === 'alertB');
      const alertBDocRun2 = alertDoc!._source!;
      // action group should be set to recovered
      expect(alertBDocRun2.kibana.alert.action_group).to.be('recovered');
      // rule type AAD payload should be set to recovery values
      expect(alertBDocRun2.instancePattern).to.eql([]);
      expect(alertBDocRun2.patternIndex).to.eql(-1);
      // uuid is the same
      expect(alertBDocRun2.kibana.alert.uuid).to.equal(alertBDocRun1.kibana.alert.uuid);
      // start time should be defined and the same as before
      expect(alertBDocRun2.kibana.alert.start).to.match(timestampPattern);
      expect(alertBDocRun2.kibana.alert.start).to.equal(alertBDocRun1.kibana.alert.start);
      // timestamp should be defined and not the same as prior run
      expect(alertBDocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertBDocRun2['@timestamp']).not.to.equal(alertBDocRun1['@timestamp']);
      // end time should be defined
      expect(alertBDocRun2.kibana.alert.end).to.match(timestampPattern);
      // status should be set to recovered
      expect(alertBDocRun2.kibana.alert.status).to.equal('recovered');
      // flapping false, flapping history updated with additional entry
      expect(alertBDocRun2.kibana.alert.flapping).to.equal(false);
      expect(alertBDocRun2.kibana.alert.flapping_history).to.eql([
        ...alertBDocRun1.kibana.alert.flapping_history!,
        true,
      ]);
      // event.action set to close
      expect(alertBDocRun2.event?.action).to.eql('close');
      expect(alertBDocRun2.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertBDocRun2.event?.kind).to.eql(alertBDocRun1.event?.kind);
      expect(alertBDocRun2.kibana.alert.workflow_status).to.eql(
        alertBDocRun1.kibana.alert.workflow_status
      );
      expect(alertBDocRun2.kibana.alert.time_range?.gte).to.equal(
        alertBDocRun1.kibana.alert.time_range?.gte
      );
      // time_range.lte should be set to end time
      expect(alertBDocRun2.kibana.alert.time_range?.lte).to.equal(alertBDocRun2.kibana.alert.end);

      // alertC, run 2
      // status is updated to recovered, duration is updated, end time is set
      alertDoc = alertDocsRun2.find((doc) => doc._source!.kibana.alert.instance.id === 'alertC');
      const alertCDocRun2 = alertDoc!._source!;
      // action group should be set to recovered
      expect(alertCDocRun2.kibana.alert.action_group).to.be('recovered');
      // rule type AAD payload should be set to recovery values
      expect(alertCDocRun2.instancePattern).to.eql([]);
      expect(alertCDocRun2.patternIndex).to.eql(-1);
      // uuid is the same
      expect(alertCDocRun2.kibana.alert.uuid).to.equal(alertCDocRun1.kibana.alert.uuid);
      // start time should be defined and the same as before
      expect(alertCDocRun2.kibana.alert.start).to.match(timestampPattern);
      expect(alertCDocRun2.kibana.alert.start).to.equal(alertCDocRun1.kibana.alert.start);
      // timestamp should be defined and not the same as prior run
      expect(alertCDocRun2['@timestamp']).to.match(timestampPattern);
      expect(alertCDocRun2['@timestamp']).not.to.equal(alertCDocRun1['@timestamp']);
      // end time should be defined
      expect(alertCDocRun2.kibana.alert.end).to.match(timestampPattern);
      // status should be set to recovered
      expect(alertCDocRun2.kibana.alert.status).to.equal('recovered');
      // flapping false, flapping history updated with additional entry
      expect(alertCDocRun2.kibana.alert.flapping).to.equal(false);
      expect(alertCDocRun2.kibana.alert.flapping_history).to.eql([
        ...alertCDocRun1.kibana.alert.flapping_history!,
        true,
      ]);
      // event.action set to close
      expect(alertCDocRun2.event?.action).to.eql('close');
      expect(alertCDocRun2.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertCDocRun2.event?.kind).to.eql(alertADocRun1.event?.kind);
      expect(alertCDocRun2.kibana.alert.workflow_status).to.eql(
        alertCDocRun1.kibana.alert.workflow_status
      );
      expect(alertCDocRun2.kibana.alert.time_range?.gte).to.equal(
        alertCDocRun1.kibana.alert.time_range?.gte
      );
      // time_range.lte should be set to end time
      expect(alertCDocRun2.kibana.alert.time_range?.lte).to.equal(alertCDocRun2.kibana.alert.end);

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
      alertDoc = alertDocsRun3.find((doc) => doc._source!.kibana.alert.instance.id === 'alertA');
      const alertADocRun3 = alertDoc!._source!;
      expect(alertADocRun3.instancePattern).to.eql(pattern.alertA);
      // uuid is the same as previous runs
      expect(alertADocRun3.kibana.alert.uuid).to.equal(alertADocRun2.kibana.alert.uuid);
      expect(alertADocRun3.kibana.alert.uuid).to.equal(alertADocRun1.kibana.alert.uuid);
      // patternIndex should be 2 for the third run
      expect(alertADocRun3.patternIndex).to.equal(2);
      expect(alertADocRun3.kibana.alert.action_group).to.equal('default');
      // start time should be defined and the same as prior runs
      expect(alertADocRun3.kibana.alert.start).to.match(timestampPattern);
      expect(alertADocRun3.kibana.alert.start).to.equal(alertADocRun2.kibana.alert.start);
      expect(alertADocRun3.kibana.alert.start).to.equal(alertADocRun1.kibana.alert.start);
      // timestamp should be defined and not the same as prior run
      expect(alertADocRun3['@timestamp']).to.match(timestampPattern);
      expect(alertADocRun3['@timestamp']).not.to.equal(alertADocRun2['@timestamp']);
      // status should still be active
      expect(alertADocRun3.kibana.alert.status).to.equal('active');
      // flapping false, flapping history updated with additional entry
      expect(alertADocRun3.kibana.alert.flapping).to.equal(false);
      expect(alertADocRun3.kibana.alert.flapping_history).to.eql([
        ...alertADocRun2.kibana.alert.flapping_history!,
        false,
      ]);
      // event.action should still to active
      expect(alertADocRun3.event?.action).to.eql('active');
      expect(alertADocRun3.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertADocRun3.event?.kind).to.eql(alertADocRun2.event?.kind);
      expect(alertADocRun3.kibana.alert.workflow_status).to.eql(
        alertADocRun2.kibana.alert.workflow_status
      );
      expect(alertADocRun3.kibana.alert.time_range?.gte).to.equal(
        alertADocRun2.kibana.alert.time_range?.gte
      );

      // alertB doc should be unchanged from prior run because it is still recovered
      // but its flapping history should be updated
      alertDoc = alertDocsRun3.find((doc) => doc._source!.kibana.alert.instance.id === 'alertB');
      const alertBDocRun3 = alertDoc!._source!;
      expect(omit(alertBDocRun3, fieldsToOmitInComparison)).to.eql(
        omit(alertBDocRun2, fieldsToOmitInComparison)
      );
      // execution uuid should be current one
      expect(alertBDocRun3.kibana.alert.rule.execution?.uuid).to.equal(executionUuid);
      // flapping history should be history from prior run with additional entry
      expect(alertBDocRun3.kibana.alert.flapping_history).to.eql([
        ...alertBDocRun2.kibana.alert.flapping_history!,
        false,
      ]);

      // alertC should have 2 docs
      const alertCDocs = alertDocsRun3.filter(
        (doc) => doc._source!.kibana.alert.instance.id === 'alertC'
      );
      // alertC recovered doc should be exactly the same as the alertC doc from prior run
      const recoveredAlertCDoc = alertCDocs.find(
        (doc) => doc._source!.kibana.alert.rule.execution?.uuid !== executionUuid
      )!._source!;
      expect(recoveredAlertCDoc).to.eql(alertCDocRun2);

      // alertC doc from current execution
      const alertCDocRun3 = alertCDocs.find(
        (doc) => doc._source!.kibana.alert.rule.execution?.uuid === executionUuid
      )!._source!;
      expect(alertCDocRun3.instancePattern).to.eql(pattern.alertC);
      // uuid is the different from prior run]
      expect(alertCDocRun3.kibana.alert.uuid).not.to.equal(alertCDocRun2.kibana.alert.uuid);
      expect(alertCDocRun3.kibana.alert.action_group).to.equal('default');
      // patternIndex should be 2 for the third run
      expect(alertCDocRun3.patternIndex).to.equal(2);
      // start time should be defined and different from the prior run
      expect(alertCDocRun3.kibana.alert.start).to.match(timestampPattern);
      expect(alertCDocRun3.kibana.alert.start).not.to.equal(alertCDocRun2.kibana.alert.start);
      // timestamp should be defined and not the same as prior run
      expect(alertCDocRun3['@timestamp']).to.match(timestampPattern);
      // duration should be '0' since this is a new alert
      expect(alertCDocRun3.kibana.alert.duration?.us).to.equal('0');
      // flapping false, flapping history should be history from prior run with additional entry
      expect(alertCDocRun3.kibana.alert.flapping).to.equal(false);
      expect(alertCDocRun3.kibana.alert.flapping_history).to.eql([
        ...alertCDocRun2.kibana.alert.flapping_history!,
        true,
      ]);
      // event.action should be 'open'
      expect(alertCDocRun3.event?.action).to.eql('open');
      expect(alertCDocRun3.tags).to.eql(['foo']);
      // these values should be the same as previous run
      expect(alertCDocRun3.event?.kind).to.eql('signal');
      expect(alertCDocRun3.kibana.alert.workflow_status).to.eql('open');
      expect(alertCDocRun3.kibana.alert.time_range?.gte).to.equal(alertCDocRun3.kibana.alert.start);
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
      expect(source.kibana.alert.rule.category).to.equal(
        'Test: Firing on a Pattern and writing Alerts as Data'
      );
      expect(source.kibana.alert.rule.consumer).to.equal('alertsFixture');
      expect(source.kibana.alert.rule.name).to.equal('abc');
      expect(source.kibana.alert.rule.producer).to.equal('alertsFixture');
      expect(source.kibana.alert.rule.tags).to.eql(['foo']);
      expect(source.kibana.alert.rule.rule_type_id).to.equal('test.patternFiringAad');
      expect(source.kibana.alert.rule.uuid).to.equal(ruleId);
      expect(source.kibana.alert.rule.parameters).to.eql(ruleParameters);
      expect(source.kibana.space_ids).to.eql(['space1']);

      if (executionUuid) {
        expect(source.kibana.alert.rule.execution?.uuid).to.equal(executionUuid);
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
