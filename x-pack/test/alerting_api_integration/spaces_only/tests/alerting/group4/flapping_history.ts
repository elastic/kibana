/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { Spaces } from '../../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function createFlappingHistoryTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const space = Spaces.default;

  const ACTIVE_PATH = 'alertInstances.instance.meta.flappingHistory';
  const RECOVERED_PATH = 'alertRecoveredInstances.instance.meta.flappingHistory';

  describe('Flapping History', function () {
    this.tags('skipFIPS');
    let actionId: string;
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    before(async () => {
      actionId = await createAction();
    });

    after(async () => {
      objectRemover.add(space.id, actionId, 'connector', 'actions');
      await objectRemover.removeAll();
    });

    afterEach(() => objectRemover.removeAll());

    it('should update flappingHistory when the alert flaps states', async () => {
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, true, false, true],
      };

      const alertId = await createAlert(pattern, actionId);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      let state = await getRuleState(start, alertId);
      expect(get(state, ACTIVE_PATH)).to.eql([true]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 2, true);
      expect(get(state, ACTIVE_PATH)).to.eql([true, false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 3, true, true);
      expect(get(state, RECOVERED_PATH)).to.eql([true, false, true]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 4, true);
      expect(get(state, ACTIVE_PATH)).to.eql([true, false, true, true]);
      expect(state.alertRecoveredInstances).to.eql({});
    });

    it('should update flappingHistory when the alert remains active', async () => {
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, true, true, true],
      };

      const alertId = await createAlert(pattern, actionId);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      let state = await getRuleState(start, alertId);
      expect(get(state, ACTIVE_PATH)).to.eql([true]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 2, true);
      expect(get(state, ACTIVE_PATH)).to.eql([true, false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 3, true);
      expect(get(state, ACTIVE_PATH)).to.eql([true, false, false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 4, true);
      expect(get(state, ACTIVE_PATH)).to.eql([true, false, false, false]);
      expect(state.alertRecoveredInstances).to.eql({});
    });

    it('should update flappingHistory when the alert remains recovered', async () => {
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, false, false, false, true],
      };

      const alertId = await createAlert(pattern, actionId);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      let state = await getRuleState(start, alertId);
      expect(get(state, ACTIVE_PATH)).to.eql([true]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 2, true, true);
      expect(get(state, RECOVERED_PATH)).to.eql([true, true]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 3, true, true);
      expect(get(state, RECOVERED_PATH)).to.eql([true, true, false]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 4, true, true);
      expect(get(state, RECOVERED_PATH)).to.eql([true, true, false, false]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, 5, true, false);
      expect(get(state, ACTIVE_PATH)).to.eql([true, true, false, false, true]);
      expect(state.alertRecoveredInstances).to.eql({});
    });
  });

  async function getState(start: string, runs: number, recovered: boolean) {
    const result: any = await retry.try(async () => {
      const searchResult = await es.search({
        index: '.kibana_task_manager',
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    'task.taskType': 'alerting:test.patternFiring',
                  },
                },
                {
                  range: {
                    'task.scheduledAt': {
                      gte: start,
                    },
                  },
                },
              ],
            },
          },
        },
      });

      const taskDoc: any = searchResult.hits.hits[0];
      const state = JSON.parse(taskDoc._source.task.state);
      const flappingHistory = recovered
        ? get(state, RECOVERED_PATH, [])
        : get(state, ACTIVE_PATH, []);
      if (flappingHistory.length !== runs) {
        throw new Error(`Expected ${runs} rule executions but received ${flappingHistory.length}.`);
      }

      return state;
    });

    return result;
  }

  async function getRuleState(
    start: string,
    alertId: string,
    runs: number = 1,
    runRule: boolean = false,
    recovered: boolean = false
  ) {
    if (runRule) {
      const response = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${alertId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);
    }
    return await getState(start, runs, recovered);
  }

  async function createAlert(pattern: { instance: boolean[] }, actionId: string) {
    const { body: createdAlert } = await supertest
      .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(
        getTestRuleData({
          rule_type_id: 'test.patternFiring',
          schedule: { interval: '24h' },
          throttle: null,
          params: {
            pattern,
          },
          actions: [],
        })
      )
      .expect(200);
    return createdAlert.id;
  }

  async function createAction() {
    const { body: createdAction } = await supertest
      .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'My action',
        connector_type_id: 'test.index-record',
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
        secrets: {
          encrypted: 'This value should be encrypted',
        },
      })
      .expect(200);
    return createdAction.id;
  }
}
