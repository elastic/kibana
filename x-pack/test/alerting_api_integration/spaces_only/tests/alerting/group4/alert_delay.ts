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
export default function createAlertDelayTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const space = Spaces.default;

  const ACTIVE_PATH = 'alertInstances.instance.meta.activeCount';
  const RECOVERED_PATH = 'alertRecoveredInstances.instance.meta.activeCount';

  describe('Alert Delay', function () {
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

    it('should update the activeCount when alert is active and clear when recovered', async () => {
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, true, true, false, true],
      };

      const ruleId = await createRule(actionId, pattern, 1);
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      let state = await getAlertState(start, ruleId);
      expect(get(state, ACTIVE_PATH)).to.eql(1);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 2, true);
      expect(get(state, ACTIVE_PATH)).to.eql(2);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 3, true);
      expect(get(state, ACTIVE_PATH)).to.eql(3);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 0, true, true);
      expect(get(state, RECOVERED_PATH)).to.eql(0);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 1, true);
      expect(get(state, ACTIVE_PATH)).to.eql(1);
    });

    it('should continue incrementing the activeCount when count of consecutive active alerts exceeds the alertDelay count', async () => {
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, true, true, true, true],
      };

      const ruleId = await createRule(actionId, pattern, 3);
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      let state = await getAlertState(start, ruleId);
      expect(get(state, ACTIVE_PATH)).to.eql(1);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 2, true);
      expect(get(state, ACTIVE_PATH)).to.eql(2);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 3, true);
      expect(get(state, ACTIVE_PATH)).to.eql(3);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 4, true);
      expect(get(state, ACTIVE_PATH)).to.eql(4);

      start = new Date().toISOString();
      state = await getAlertState(start, ruleId, 5, true);
      expect(get(state, ACTIVE_PATH)).to.eql(5);
    });
  });

  async function getState(start: string, count: number, recovered: boolean) {
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
      const activeCount = recovered ? get(state, RECOVERED_PATH) : get(state, ACTIVE_PATH);
      if (activeCount !== count) {
        throw new Error(`Expected ${count} rule executions but received ${activeCount}.`);
      }

      return state;
    });

    return result;
  }

  async function getAlertState(
    start: string,
    ruleId: string,
    count: number = 1,
    runRule: boolean = false,
    recovered: boolean = false
  ) {
    if (runRule) {
      const response = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);
    }
    return await getState(start, count, recovered);
  }

  async function createRule(
    actionId: string,
    pattern: { instance: boolean[] },
    activeCount?: number
  ) {
    const { body: createdRule } = await supertest
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
          actions: [
            {
              id: actionId,
              group: 'default',
              params: {},
            },
          ],
          ...(activeCount ? { alert_delay: { active: activeCount } } : {}),
        })
      )
      .expect(200);
    return createdRule.id;
  }

  async function createAction() {
    const { body: createdAction } = await supertest
      .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'My action',
        connector_type_id: 'test.noop',
        config: {},
        secrets: {},
      })
      .expect(200);
    return createdAction.id;
  }
}
