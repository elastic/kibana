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
  AlertUtils as RuleUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
} from '../../../common/lib';
import { validateEvent } from './event_log';

// eslint-disable-next-line import/no-default-export
export default function createDisableRuleTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('disable', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const ruleUtils = new RuleUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should handle disable rule request appropriately', async () => {
      const { body: createdRule } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await ruleUtils.disable(createdRule.id);

      try {
        await getScheduledTask(createdRule.scheduled_task_id);
        throw new Error('Should have removed scheduled task');
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it(`shouldn't disable rule from another space`, async () => {
      const { body: createdRule } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.other.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.other.id, createdRule.id, 'rule', 'alerting');

      await ruleUtils.getDisableRequest(createdRule.id).expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [alert/${createdRule.id}] not found`,
      });
    });

    it('should create recovered-instance events for all alerts', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          name: 'abc',
          tags: ['foo'],
          rule_type_id: 'test.cumulative-firing',
          consumer: 'alertsFixture',
          schedule: { interval: '5s' },
          throttle: '5s',
          actions: [],
          params: {},
          notify_when: 'onThrottleInterval',
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      // wait for rule to actually execute
      await retry.try(async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}/state`
        );

        expect(response.status).to.eql(200);
        expect(response.body).to.key('alerts', 'rule_type_state', 'previous_started_at');
        expect(response.body.rule_type_state.runCount).to.greaterThan(1);
      });

      await ruleUtils.getDisableRequest(createdRule.id);
      const ruleId = createdRule.id;

      // wait for the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            // make sure the counts of the # of events per type are as expected
            ['recovered-instance', { equal: 2 }],
          ]),
        });
      });

      const event = events[0];
      expect(event).to.be.ok();

      validateEvent(event, {
        spaceId: Spaces.space1.id,
        savedObjects: [
          { type: 'alert', id: ruleId, rel: 'primary', type_id: 'test.cumulative-firing' },
        ],
        message: "instance 'instance-0' has recovered due to the rule was disabled",
        shouldHaveEventEnd: false,
        shouldHaveTask: false,
        rule: {
          id: ruleId,
          category: createdRule.rule_type_id,
          license: 'basic',
          ruleset: 'alertsFixture',
          name: 'abc',
        },
      });
    });

    it('should disable rule even if associated task manager document is missing', async () => {
      const { body: createdRule } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      // manually remove scheduled task
      await es.delete({
        id: `task:${createdRule.scheduled_task_id}`,
        index: '.kibana_task_manager',
      });
      await ruleUtils.disable(createdRule.id);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    describe('legacy', () => {
      it('should handle disable rule request appropriately', async () => {
        const { body: createdRule } = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ enabled: true }))
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdRule.id}/_disable`)
          .set('kbn-xsrf', 'foo')
          .expect(204);

        try {
          await getScheduledTask(createdRule.scheduled_task_id);
          throw new Error('Should have removed scheduled task');
        } catch (e) {
          expect(e.meta.statusCode).to.eql(404);
        }

        // Ensure AAD isn't broken
        await checkAAD({
          supertest: supertestWithoutAuth,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdRule.id,
        });
      });
    });
  });
}
