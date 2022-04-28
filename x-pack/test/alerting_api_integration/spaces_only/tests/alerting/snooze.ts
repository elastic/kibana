/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
} from '../../../common/lib';

const FUTURE_SNOOZE_TIME = '9999-12-31T06:00:00.000Z';

// eslint-disable-next-line import/no-default-export
export default function createSnoozeRuleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const retry = getService('retry');

  describe('snooze', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    it('should handle snooze rule request appropriately', async () => {
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

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
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
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const response = await alertUtils
        .getSnoozeRequest(createdRule.id)
        .send({ snooze_end_time: FUTURE_SNOOZE_TIME });

      expect(response.statusCode).to.eql(204);
      expect(response.body).to.eql('');
      const { body: updatedAlert } = await supertestWithoutAuth
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      expect(updatedAlert.snooze_end_time).to.eql(FUTURE_SNOOZE_TIME);
      expect(updatedAlert.mute_all).to.eql(false);
      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should handle snooze rule request appropriately when snoozeEndTime is -1', async () => {
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

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
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
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const response = await alertUtils
        .getSnoozeRequest(createdRule.id)
        .send({ snooze_end_time: -1 });

      expect(response.statusCode).to.eql(204);
      expect(response.body).to.eql('');
      const { body: updatedAlert } = await supertestWithoutAuth
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      expect(updatedAlert.snooze_end_time).to.eql(null);
      expect(updatedAlert.mute_all).to.eql(true);
      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should not trigger actions when snoozed', async () => {
      const { body: createdAction, status: connStatus } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        });
      expect(connStatus).to.be(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      log.info('creating rule');
      const { body: createdRule, status: ruleStatus } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'should not trigger actions when snoozed',
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActiveAlert',
            params: {
              pattern: { instance: arrayOfTrues(100) },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );
      expect(ruleStatus).to.be(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      // wait for an action to be triggered
      log.info('wait for rule to trigger an action');
      await getRuleEvents(createdRule.id);

      log.info('start snoozing');
      const snoozeSeconds = 10;
      const snoozeEndDate = new Date(Date.now() + 1000 * snoozeSeconds);
      await alertUtils
        .getSnoozeRequest(createdRule.id)
        .send({ snooze_end_time: snoozeEndDate.toISOString() });

      // could be an action execution while calling snooze, so set snooze start
      // to a value that we know it will be in effect (after this call)
      const snoozeStartDate = new Date();

      // wait for 4 triggered actions - in case some fired before snooze went into effect
      log.info('wait for snoozing to end');
      const ruleEvents = await getRuleEvents(createdRule.id, 4);
      const snoozeStart = snoozeStartDate.valueOf();
      const snoozeEnd = snoozeStartDate.valueOf();
      let actionsBefore = 0;
      let actionsDuring = 0;
      let actionsAfter = 0;

      for (const event of ruleEvents) {
        const timestamp = event?.['@timestamp'];
        if (!timestamp) continue;

        const time = new Date(timestamp).valueOf();
        if (time < snoozeStart) {
          actionsBefore++;
        } else if (time > snoozeEnd) {
          actionsAfter++;
        } else {
          actionsDuring++;
        }
      }

      expect(actionsBefore).to.be.greaterThan(0, 'no actions triggered before snooze');
      expect(actionsAfter).to.be.greaterThan(0, 'no actions triggered after snooze');
      expect(actionsDuring).to.be(0);
    });
  });

  async function getRuleEvents(id: string, minActions: number = 1) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute-action', { gte: minActions }]]),
      });
    });
  }
}

function arrayOfTrues(length: number) {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(true);
  }
  return result;
}
