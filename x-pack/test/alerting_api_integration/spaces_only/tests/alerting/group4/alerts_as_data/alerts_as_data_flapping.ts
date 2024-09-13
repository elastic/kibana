/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { ALERT_FLAPPING, ALERT_FLAPPING_HISTORY, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
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
export default function createAlertsAsDataFlappingTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);

  type PatternFiringAlert = Alert;

  const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';

  describe('alerts as data flapping', function () {
    this.tags('skipFIPS');
    beforeEach(async () => {
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await objectRemover.removeAll();
    });

    // These are the same tests from x-pack/test/alerting_api_integration/spaces_only/tests/alerting/group1/event_log.ts
    // but testing that flapping status & flapping history is updated as expected for AAD docs

    it('should set flapping and flapping_history for flapping alerts that settle on active', async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth('superuser', 'superuser')
        .send({
          enabled: true,
          look_back_window: 6,
          status_change_threshold: 4,
        })
        .expect(200);
      // wait so cache expires
      await setTimeoutAsync(60000);

      const pattern = {
        alertA: [true, false, false, true, false, true, false, true, false].concat(
          ...new Array(8).fill(true),
          false
        ),
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
            notify_when: RuleNotifyWhen.CHANGE,
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;

      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // Wait for the rule to run once
      let run = 1;
      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));
      // Run the rule 4 more times
      for (let i = 0; i < 4; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      let alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      let state: any = await getRuleState(ruleId);

      // Should be 2 alert docs because alert pattern was:
      // active, recovered, recovered, active, recovered
      expect(alertDocs.length).to.equal(2);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertRecoveredInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc should be false while flapping value for state should be true
      // This is because we write out the alert doc BEFORE calculating the latest flapping state and
      // persisting into task state
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(false);
      expect(state.alertRecoveredInstances.alertA.meta.flapping).to.equal(true);

      // Run the rule 6 more times
      for (let i = 0; i < 6; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should be 3 alert docs now because alert became active again
      expect(alertDocs.length).to.equal(3);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc and task state should be true because alert is flapping
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(true);
      expect(state.alertInstances.alertA.meta.flapping).to.equal(true);

      // Run the rule 7 more times
      for (let i = 0; i < 7; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should still be 3 alert docs
      expect(alertDocs.length).to.equal(3);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertRecoveredInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc and task state should be false because alert was active for long
      // enough to reset the flapping state
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(false);
      expect(state.alertRecoveredInstances.alertA.meta.flapping).to.equal(false);
    });

    it('should set flapping and flapping_history for flapping alerts that settle on recovered', async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth('superuser', 'superuser')
        .send({
          enabled: true,
          look_back_window: 6,
          status_change_threshold: 4,
        })
        .expect(200);
      // wait so cache expires
      await setTimeoutAsync(60000);

      const pattern = {
        alertA: [true, false, false, true, false, true, false, true, false, true].concat(
          new Array(11).fill(false)
        ),
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
            notify_when: RuleNotifyWhen.CHANGE,
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // Wait for the rule to run once
      let run = 1;
      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));
      // Run the rule 4 more times
      for (let i = 0; i < 4; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      let alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      let state: any = await getRuleState(ruleId);

      // Should be 2 alert docs because alert pattern was:
      // active, recovered, recovered, active, recovered
      expect(alertDocs.length).to.equal(2);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertRecoveredInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc should be false while flapping value for state should be true
      // This is because we write out the alert doc BEFORE calculating the latest flapping state and
      // persisting into task state
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(false);
      expect(state.alertRecoveredInstances.alertA.meta.flapping).to.equal(true);

      // Run the rule 6 more times
      for (let i = 0; i < 6; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should be 3 alert docs now because alert became active again
      expect(alertDocs.length).to.equal(3);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc and task state should be true because alert is flapping
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(true);
      expect(state.alertInstances.alertA.meta.flapping).to.equal(true);

      // Run the rule 3 more times
      for (let i = 0; i < 3; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should still be 3 alert docs
      expect(alertDocs.length).to.equal(3);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertRecoveredInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc and task state should be true because alert recovered while flapping
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(true);
      expect(state.alertRecoveredInstances.alertA.meta.flapping).to.equal(true);
    });

    it('Should not fail when an alert is flapping and recovered for a rule with notify_when: onThrottleInterval', async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth('superuser', 'superuser')
        .send({
          enabled: true,
          look_back_window: 5,
          status_change_threshold: 3,
        })
        .expect(200);
      // wait so cache expires
      await setTimeoutAsync(60000);

      const pattern = {
        alertA: [true, false, true, false, false, false, false, false, false],
      };
      const ruleParameters = { pattern };
      const createdRule = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          // notify_when is not RuleNotifyWhen.CHANGE, so it's not added to activeCurrent
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

      // Wait for the rule to run once
      let run = 1;
      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));
      // Run the rule 10 more times
      for (let i = 0; i < 5; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      const alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);
      const state = await getRuleState(ruleId);

      expect(alertDocs.length).to.equal(2);

      // Alert is recovered and flapping
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(true);
      expect(state.alertRecoveredInstances.alertA.meta.flapping).to.equal(true);
    });

    it('should set flapping and flapping_history for flapping alerts over a period of time longer than the lookback', async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth('superuser', 'superuser')
        .send({
          enabled: true,
          look_back_window: 5,
          status_change_threshold: 5,
        })
        .expect(200);
      // wait so cache expires
      await setTimeoutAsync(60000);

      const pattern = {
        alertA: [true, false, false, true, false, true, false, true, false].concat(
          ...new Array(8).fill(true),
          false
        ),
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
            notify_when: RuleNotifyWhen.CHANGE,
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;

      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // Wait for the rule to run once
      let run = 1;
      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));
      // Run the rule 6 more times
      for (let i = 0; i < 6; i++) {
        await retry.try(async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
            .set('kbn-xsrf', 'foo');
          expect(response.status).to.eql(204);
        });

        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      let alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      let state: any = await getRuleState(ruleId);

      // Should be 3 alert docs because alert pattern was:
      // active, recovered, recovered, active, recovered, active, recovered
      expect(alertDocs.length).to.equal(3);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertRecoveredInstances.alertA.meta.flappingHistory
      );

      // Alert shouldn't be flapping because the status change threshold hasn't been exceeded
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(false);
      expect(state.alertRecoveredInstances.alertA.meta.flapping).to.equal(false);

      // Run the rule 1 more time
      for (let i = 0; i < 1; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should be 4 alert docs now because alert became active again
      expect(alertDocs.length).to.equal(4);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc should be false while flapping value for state should be true
      // This is because we write out the alert doc BEFORE calculating the latest flapping state and
      // persisting into task state
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(false);
      expect(state.alertInstances.alertA.meta.flapping).to.equal(true);

      // Run the rule 6 more times
      for (let i = 0; i < 6; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should still be 4 alert docs
      expect(alertDocs.length).to.equal(4);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc should be true while flapping value for state should be false
      // This is because we write out the alert doc BEFORE calculating the latest flapping state and
      // persisting into task state
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(true);
      expect(state.alertInstances.alertA.meta.flapping).to.equal(false);

      // Run the rule 3 more times
      for (let i = 0; i < 3; i++) {
        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: ++run }]]));
      }

      // Query for alerts
      alertDocs = await queryForAlertDocs<PatternFiringAlert>(ruleId);

      // Get rule state from task document
      state = await getRuleState(ruleId);

      // Should still be 4 alert docs
      expect(alertDocs.length).to.equal(4);

      // Newest alert doc is first
      // Flapping history for newest alert doc should match flapping history in state
      expect(alertDocs[0]._source![ALERT_FLAPPING_HISTORY]).to.eql(
        state.alertInstances.alertA.meta.flappingHistory
      );

      // Flapping value for alert doc and task state should be true because lookback threshold exceeded
      expect(alertDocs[0]._source![ALERT_FLAPPING]).to.equal(false);
      expect(state.alertInstances.alertA.meta.flapping).to.equal(false);
    });
  });

  async function getRuleState(ruleId: string) {
    const task = await es.get<TaskManagerDoc>({
      id: `task:${ruleId}`,
      index: '.kibana_task_manager',
    });

    return JSON.parse(task._source!.task.state);
  }

  async function queryForAlertDocs<T>(ruleId: string): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
      body: {
        query: {
          bool: {
            must: {
              term: {
                [ALERT_RULE_UUID]: { value: ruleId },
              },
            },
          },
        },
      },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
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
