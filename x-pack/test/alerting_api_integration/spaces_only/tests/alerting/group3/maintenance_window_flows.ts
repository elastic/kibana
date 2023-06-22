/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import moment from 'moment';
import expect from '@kbn/expect';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover, getEventLog } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function maintenanceWindowFlowsTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('maintenanceWindowFlows', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('alerts triggered before a MW should fire actions when active or recovered during a MW', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create action and rule
      const action = await createAction();
      const rule = await createRule({ actionId: action.id, pattern });

      // Run the first time - active
      await getRuleEvents({
        id: rule.id,
        action: 1,
        activeInstance: 1,
      });

      // Run again - active, 2 action
      await runSoon(rule.id);
      await getRuleEvents({
        id: rule.id,
        action: 2,
        activeInstance: 2,
      });

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow();
      const activeMaintenanceWindows = await getActiveMaintenanceWindows();
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);

      // Run again - recovered, 3 actions, fired in MW
      await runSoon(rule.id);
      await getRuleEvents({
        id: rule.id,
        action: 3,
        activeInstance: 2,
        recoveredInstance: 1,
      });

      // Run again - active, 3 actions, new active action NOT fired in MW
      await runSoon(rule.id);
      await getRuleEvents({
        id: rule.id,
        action: 3,
        activeInstance: 3,
        recoveredInstance: 1,
      });
    });

    it('alerts triggered within a MW should not fire actions if active or recovered during a MW', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow();
      const activeMaintenanceWindows = await getActiveMaintenanceWindows();
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);

      // Create action and rule
      const action = await createAction();
      const rule = await createRule({ actionId: action.id, pattern });

      // Run the first time - active
      await getRuleEvents({ id: rule.id, activeInstance: 1 });

      await expectNoActionsFired(rule.id);

      // Run again - active
      await runSoon(rule.id);
      await getRuleEvents({ id: rule.id, activeInstance: 2 });

      await expectNoActionsFired(rule.id);

      // Run again - recovered
      await runSoon(rule.id);
      await getRuleEvents({ id: rule.id, activeInstance: 2, recoveredInstance: 1 });

      await expectNoActionsFired(rule.id);

      // Run again - active again
      await runSoon(rule.id);
      await getRuleEvents({ id: rule.id, activeInstance: 3, recoveredInstance: 1 });

      await expectNoActionsFired(rule.id);
    });

    it('alerts triggered within a MW should not fire actions if active or recovered outside a MW', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow();
      const activeMaintenanceWindows = await getActiveMaintenanceWindows();
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);

      // Create action and rule
      const action = await createAction();
      const rule = await createRule({ actionId: action.id, pattern });

      // Run the first time - active
      await getRuleEvents({ id: rule.id, activeInstance: 1 });

      await expectNoActionsFired(rule.id);

      // End the maintenance window
      await finishMaintenanceWindow(maintenanceWindow.id);
      const empty = await getActiveMaintenanceWindows();
      expect(empty).eql([]);

      // Run again - active
      await runSoon(rule.id);
      await getRuleEvents({ id: rule.id, activeInstance: 2 });

      await expectNoActionsFired(rule.id);

      // Run again - recovered
      await runSoon(rule.id);
      await getRuleEvents({ id: rule.id, activeInstance: 2, recoveredInstance: 1 });

      await expectNoActionsFired(rule.id);

      // Run again - active again, this time fire the action since its a new alert instance
      await runSoon(rule.id);
      await getRuleEvents({
        id: rule.id,
        action: 1,
        activeInstance: 3,
        recoveredInstance: 1,
      });
    });

    // Helper functions:
    async function createRule({
      actionId,
      pattern,
    }: {
      actionId: string;
      pattern: { instance: boolean[] };
    }) {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'test-rule',
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '24h' },
            throttle: null,
            notify_when: 'onActiveAlert',
            params: {
              pattern,
            },
            actions: [
              {
                id: actionId,
                group: 'default',
                params: {},
              },
              {
                id: actionId,
                group: 'recovered',
                params: {},
              },
            ],
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
      return createdRule;
    }

    async function createAction() {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');
      return createdAction;
    }

    async function createMaintenanceWindow() {
      const { body: window } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          title: 'test-maintenance-window-1',
          duration: 60 * 60 * 1000, // 1 hr
          r_rule: {
            dtstart: moment.utc().toISOString(),
            tzid: 'UTC',
            freq: 0, // yearly
            count: 1,
          },
        })
        .expect(200);

      objectRemover.add(Spaces.space1.id, window.id, 'rules/maintenance_window', 'alerting', true);
      return window;
    }

    async function getActiveMaintenanceWindows() {
      const { body: activeMaintenanceWindows } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window/_active`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      return activeMaintenanceWindows;
    }

    function finishMaintenanceWindow(id: string) {
      return supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/internal/alerting/rules/maintenance_window/${id}/_finish`
        )
        .set('kbn-xsrf', 'foo')
        .expect(200);
    }

    async function getRuleEvents({
      id,
      action,
      newInstance,
      activeInstance,
      recoveredInstance,
    }: {
      id: string;
      action?: number;
      newInstance?: number;
      activeInstance?: number;
      recoveredInstance?: number;
    }) {
      const actions: Array<[string, { equal: number }]> = [];
      if (action) {
        actions.push(['execute-action', { equal: action }]);
      }
      if (newInstance) {
        actions.push(['new-instance', { equal: newInstance }]);
      }
      if (activeInstance) {
        actions.push(['active-instance', { equal: activeInstance }]);
      }
      if (recoveredInstance) {
        actions.push(['recovered-instance', { equal: recoveredInstance }]);
      }
      return retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id,
          provider: 'alerting',
          actions: new Map(actions),
        });
      });
    }

    async function expectNoActionsFired(id: string) {
      const events = await retry.try(async () => {
        const { body: result } = await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/_test/event_log/alert/${id}/_find?per_page=5000`)
          .expect(200);

        if (!result.total) {
          throw new Error('no events found yet');
        }
        return result.data as IValidatedEvent[];
      });

      const actionEvents = events.filter((event) => {
        return event?.event?.action === 'execute-action';
      });

      expect(actionEvents.length).eql(0);
    }

    function runSoon(id: string) {
      return retry.try(async () => {
        await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${id}/_run_soon`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });
    }
  });
}
