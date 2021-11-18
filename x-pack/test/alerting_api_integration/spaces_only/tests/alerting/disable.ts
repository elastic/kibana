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
  getTestAlertData,
  ObjectRemover,
  getEventLog,
} from '../../../common/lib';
import { validateEvent } from './event_log';

// eslint-disable-next-line import/no-default-export
export default function createDisableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('disable', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should handle disable alert request appropriately', async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await alertUtils.disable(createdAlert.id);

      try {
        await getScheduledTask(createdAlert.scheduledTaskId);
        throw new Error('Should have removed scheduled task');
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    it(`shouldn't disable alert from another space`, async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.other.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.other.id, createdAlert.id, 'rule', 'alerting');

      await alertUtils.getDisableRequest(createdAlert.id).expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [alert/${createdAlert.id}] not found`,
      });
    });

    it('should create recovered-instance events for all alert instances', async () => {
      const { body: createdAlert } = await supertest
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
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      // wait for alert to actually execute
      await retry.try(async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert.id}/state`
        );

        expect(response.status).to.eql(200);
        expect(response.body).to.key('alerts', 'rule_type_state', 'previous_started_at');
        expect(response.body.rule_type_state.runCount).to.greaterThan(1);
      });

      await alertUtils.getDisableRequest(createdAlert.id);
      const ruleId = createdAlert.id;

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
          category: createdAlert.rule_type_id,
          license: 'basic',
          ruleset: 'alertsFixture',
          name: 'abc',
        },
      });
    });

    describe('legacy', () => {
      it('should handle disable alert request appropriately', async () => {
        const { body: createdAlert } = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestAlertData({ enabled: true }))
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/_disable`)
          .set('kbn-xsrf', 'foo')
          .expect(204);

        try {
          await getScheduledTask(createdAlert.scheduledTaskId);
          throw new Error('Should have removed scheduled task');
        } catch (e) {
          expect(e.meta.statusCode).to.eql(404);
        }

        // Ensure AAD isn't broken
        await checkAAD({
          supertest: supertestWithoutAuth,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdAlert.id,
        });
      });
    });
  });
}
