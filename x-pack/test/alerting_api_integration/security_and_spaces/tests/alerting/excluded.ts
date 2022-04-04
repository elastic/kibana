/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import {
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
  getEventLog,
  AlertUtils,
  ES_TEST_INDEX_NAME,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('excluded', () => {
    const objectRemover = new ObjectRemover(supertest);
    const scenario = UserAtSpaceScenarios[1];

    let alertUtils: AlertUtils;
    before(async () => {
      alertUtils = new AlertUtils({
        user: scenario.user,
        space: scenario.space,
        supertestWithoutAuth,
        objectRemover,
      });
    });
    after(() => objectRemover.removeAll());

    it('should handle create alert request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(scenario.space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.excluded',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(scenario.space.id, createdAction.id, 'connector', 'actions');

      const reference = alertUtils.generateReference();
      const { body: rule } = await supertestWithoutAuth
        .post(`${getUrlPrefix(scenario.space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(scenario.user.username, scenario.user.password)
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing',
            schedule: { interval: '1s' },
            throttle: '1s',
            notify_when: 'onActiveAlert',
            params: {
              index: ES_TEST_INDEX_NAME,
              reference,
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);

      objectRemover.add(scenario.space.id, rule.id, 'rule', 'alerting');
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: scenario.space.id,
          type: 'alert',
          id: rule.id,
          provider: 'alerting',
          actions: new Map([['execute-action', { gte: 3 }]]),
        });
      });
      let message;
      try {
        await getEventLog({
          getService,
          spaceId: scenario.space.id,
          type: 'action',
          id: createdAction.id,
          provider: 'actions',
          actions: new Map([['execute-start', { gte: 0 }]]),
        });
      } catch (err) {
        message = err.message;
      }
      expect(message).to.eql('no events found yet');
    });
  });
}
