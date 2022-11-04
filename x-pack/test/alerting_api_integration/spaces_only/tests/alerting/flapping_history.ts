/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  AlertUtils,
} from '../../../common/lib';
import { Spaces } from '../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function createFlappingHistoryTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const space = Spaces.space1;

  describe('Flapping History', () => {
    let alertUtils: AlertUtils;
    let actionId: string;
    const authorizationIndex = '.kibana-test-authorization';
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
      actionId = await createAction();
      alertUtils = new AlertUtils({
        space,
        supertestWithoutAuth,
        indexRecordActionId: actionId,
        objectRemover,
      });
    });

    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      objectRemover.add(space.id, actionId, 'connector', 'actions');
      await objectRemover.removeAll();
    });

    afterEach(() => objectRemover.removeAll());

    it('should update flappingHistory when the alert flaps states', async () => {
      const reference = alertUtils.generateReference();
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, true, false, true],
      };

      const alertId = await createAlert(pattern, actionId, reference);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      let state = await getRuleState(start, alertId, reference);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 2, true);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false, false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 3, true);
      expect(state.alertRecoveredInstances.instance.flappingHistory).to.eql([false, false, true]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 4, true);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false, false, true, true]);
      expect(state.alertRecoveredInstances).to.eql({});
    });

    it('should update flappingHistory when the alert remains active', async () => {
      const reference = alertUtils.generateReference();
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, true, true, true],
      };

      const alertId = await createAlert(pattern, actionId, reference);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      let state = await getRuleState(start, alertId, reference);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 2, true);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false, false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 3, true);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false, false, false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 4, true);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false, false, false, false]);
      expect(state.alertRecoveredInstances).to.eql({});
    });

    it('should update flappingHistory when the alert remains recovered', async () => {
      const reference = alertUtils.generateReference();
      let start = new Date().toISOString();
      const pattern = {
        instance: [true, false, false, false, false],
      };

      const alertId = await createAlert(pattern, actionId, reference);
      objectRemover.add(space.id, alertId, 'rule', 'alerting');

      let state = await getRuleState(start, alertId, reference);
      expect(state.alertInstances.instance.flappingHistory).to.eql([false]);
      expect(state.alertRecoveredInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 2, true);
      expect(state.alertRecoveredInstances.instance.flappingHistory).to.eql([false, true]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 3, true);
      expect(state.alertRecoveredInstances.instance.flappingHistory).to.eql([false, true, false]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 4, true);
      expect(state.alertRecoveredInstances.instance.flappingHistory).to.eql([
        false,
        true,
        false,
        false,
      ]);
      expect(state.alertInstances).to.eql({});

      start = new Date().toISOString();
      state = await getRuleState(start, alertId, reference, 5, true);
      expect(state.alertRecoveredInstances.instance.flappingHistory).to.eql([
        false,
        true,
        false,
        false,
        false,
      ]);
      expect(state.alertInstances).to.eql({});
    });
  });

  async function getTaskDoc(start: string) {
    const doc: any = await retry.try(async () => {
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
      expect((searchResult.hits.total as estypes.SearchTotalHits).value).to.eql(1);
      return searchResult.hits.hits[0];
    });
    return doc;
  }

  async function getRuleState(
    start: string,
    alertId: string,
    reference: string,
    numDocs: number = 1,
    runRule: boolean = false
  ) {
    if (runRule) {
      const response = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${alertId}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(response.status).to.eql(204);
    }

    await esTestIndexTool.waitForDocs('action:test.index-record', reference, numDocs);

    const taskDoc: any = await getTaskDoc(start);
    const state = JSON.parse(taskDoc._source.task.state);
    return state;
  }

  async function createAlert(
    pattern: { instance: boolean[] },
    actionId: string,
    reference: string
  ) {
    const { body: createdAlert } = await supertestWithoutAuth
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
              group: 'default',
              id: actionId,
              params: {
                index: ES_TEST_INDEX_NAME,
                reference,
                message: 'Active message',
              },
            },
            {
              group: RecoveredActionGroup.id,
              id: actionId,
              params: {
                index: ES_TEST_INDEX_NAME,
                reference,
                message: 'Recovered message',
              },
            },
          ],
        })
      )
      .expect(200);
    return createdAlert.id;
  }

  async function createAction() {
    const { body: createdAction } = await supertestWithoutAuth
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
