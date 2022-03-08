/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';

import { Spaces } from '../../scenarios';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestRuleData,
  AlertUtils,
  getEventLog,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetAlertSummaryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

  describe('getAlertSummary', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it(`handles non-existent rule`, async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/1/_alert_summary`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });

    it('handles no-op rule', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
      );

      expect(response.status).to.eql(200);

      const { status_start_date: statusStartDate, status_end_date: statusEndDate } = response.body;
      expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));

      const stableBody = omit(response.body, [
        'status_start_date',
        'status_end_date',
        'last_run',
        'execution_duration',
      ]);
      expect(stableBody).to.eql({
        id: createdRule.id,
        name: 'abc',
        tags: ['foo'],
        rule_type_id: 'test.noop',
        consumer: 'alertsFixture',
        status: 'OK',
        mute_all: false,
        throttle: '1m',
        enabled: true,
        error_messages: [],
        alerts: {},
      });
    });

    it('handles no-op rule without waiting for execution event', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
      );

      expect(response.status).to.eql(200);

      const { status_start_date: statusStartDate, status_end_date: statusEndDate } = response.body;
      expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));

      const stableBody = omit(response.body, [
        'status_start_date',
        'status_end_date',
        'last_run',
        'execution_duration',
      ]);
      expect(stableBody).to.eql({
        id: createdRule.id,
        name: 'abc',
        tags: ['foo'],
        rule_type_id: 'test.noop',
        consumer: 'alertsFixture',
        status: 'OK',
        mute_all: false,
        throttle: '1m',
        enabled: true,
        error_messages: [],
        alerts: {},
      });
    });

    it('handles dateStart parameter', async () => {
      const dateStart = '2020-08-08T08:08:08.008Z';
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_alert_summary?date_start=${dateStart}`
      );
      expect(response.status).to.eql(200);
      const { status_start_date: statusStartDate, status_end_date: statusEndDate } = response.body;
      expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));
      expect(statusStartDate).to.be(dateStart);
    });

    it('handles invalid dateStart parameter', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, ['execute']);
      const dateStart = 'X0X0-08-08T08:08:08.008Z';
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_alert_summary?date_start=${dateStart}`
      );
      expect(response.status).to.eql(400);
      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid date for parameter dateStart: "X0X0-08-08T08:08:08.008Z"',
      });
    });

    it('handles muted alerts', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await alertUtils.muteInstance(createdRule.id, '1');
      await waitForEvents(createdRule.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
      );

      expect(response.status).to.eql(200);
      expect(response.body.alerts).to.eql({
        '1': {
          status: 'OK',
          muted: true,
        },
      });
    });

    it('handles rule errors', async () => {
      const dateNow = Date.now();
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ rule_type_id: 'test.throw' }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
      );
      const { error_messages: errorMessages } = response.body;
      expect(errorMessages.length).to.be.greaterThan(0);
      const errorMessage = errorMessages[0];
      expect(Date.parse(errorMessage.date)).to.be.greaterThan(dateNow);
      expect(errorMessage.message).to.be('this alert is intended to fail');
    });

    it('handles multi-alert status', async () => {
      // pattern of when the rule should fire
      const pattern = {
        alertA: [true, true, true, true],
        alertB: [true, true, false, false],
        alertC: [true, true, true, true],
      };

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            params: { pattern },
            schedule: { interval: '1s' },
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await alertUtils.muteInstance(createdRule.id, 'alertC');
      await alertUtils.muteInstance(createdRule.id, 'alertD');
      await waitForEvents(createdRule.id, ['new-instance', 'recovered-instance']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
      );

      const actualAlerts = response.body.alerts;
      const expectedAlerts = {
        alertA: {
          status: 'Active',
          muted: false,
          actionGroupId: 'default',
          activeStartDate: actualAlerts.alertA.activeStartDate,
        },
        alertB: {
          status: 'OK',
          muted: false,
        },
        alertC: {
          status: 'Active',
          muted: true,
          actionGroupId: 'default',
          activeStartDate: actualAlerts.alertC.activeStartDate,
        },
        alertD: {
          status: 'OK',
          muted: true,
        },
      };
      expect(actualAlerts).to.eql(expectedAlerts);
    });

    describe('legacy', () => {
      it('handles multi-alert status', async () => {
        // pattern of when the alert should fire
        const pattern = {
          alertA: [true, true, true, true],
          alertB: [true, true, false, false],
          alertC: [true, true, true, true],
        };

        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.patternFiring',
              params: { pattern },
              schedule: { interval: '1s' },
            })
          )
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        await alertUtils.muteInstance(createdRule.id, 'alertC');
        await alertUtils.muteInstance(createdRule.id, 'alertD');
        await waitForEvents(createdRule.id, ['new-instance', 'recovered-instance']);
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdRule.id}/_instance_summary`
        );

        const actualAlerts = response.body.instances;
        const expectedAlerts = {
          alertA: {
            status: 'Active',
            muted: false,
            actionGroupId: 'default',
            activeStartDate: actualAlerts.alertA.activeStartDate,
          },
          alertB: {
            status: 'OK',
            muted: false,
          },
          alertC: {
            status: 'Active',
            muted: true,
            actionGroupId: 'default',
            activeStartDate: actualAlerts.alertC.activeStartDate,
          },
          alertD: {
            status: 'OK',
            muted: true,
          },
        };
        expect(actualAlerts).to.eql(expectedAlerts);
      });
    });
  });

  async function waitForEvents(id: string, actions: string[]) {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map(actions.map((action) => [action, { gte: 1 }])),
      });
    });
  }
}
