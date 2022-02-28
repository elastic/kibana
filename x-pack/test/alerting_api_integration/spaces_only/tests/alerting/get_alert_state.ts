/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover, getTestRuleData } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetAlertStateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('getAlertState', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle getAlertState request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert.id}/state`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.key('alerts', 'previous_started_at');
    });

    it('should fetch updated state', async () => {
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

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert.id}/state`
      );

      expect(response.body.rule_type_state.runCount).to.greaterThan(0);

      const alertInstances = Object.entries<Record<string, any>>(response.body.alerts);
      expect(alertInstances.length).to.eql(response.body.rule_type_state.runCount);
      alertInstances.forEach(([key, value], index) => {
        expect(key).to.eql(`instance-${index}`);
        expect(value.state.instanceStateValue).to.be(true);
        expect(value.state.start).not.to.be(undefined);
        expect(value.state.duration).not.to.be(undefined);
      });
    });

    it(`should handle getAlertState request appropriately when alert doesn't exist`, async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/1/state`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });

    describe('legacy', () => {
      it('should fetch updated state', async () => {
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
            `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/state`
          );

          expect(response.status).to.eql(200);
          expect(response.body).to.key('alertInstances', 'alertTypeState', 'previousStartedAt');
          expect(response.body.alertTypeState.runCount).to.greaterThan(1);
        });

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert.id}/state`
        );

        expect(response.body.rule_type_state.runCount).to.greaterThan(0);

        const alertInstances = Object.entries<Record<string, any>>(response.body.alerts);
        expect(alertInstances.length).to.eql(response.body.rule_type_state.runCount);
        alertInstances.forEach(([key, value], index) => {
          expect(key).to.eql(`instance-${index}`);
          expect(value.state.instanceStateValue).to.be(true);
          expect(value.state.start).not.to.be(undefined);
          expect(value.state.duration).not.to.be(undefined);
        });
      });
    });
  });
}
