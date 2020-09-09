/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';

import { Spaces } from '../../scenarios';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestAlertData,
  AlertUtils,
  getEventLog,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetAlertInstanceSummaryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

  describe('getAlertInstanceSummary', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it(`handles non-existant alert`, async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/1/_instance_summary`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });

    it('handles no-op alert', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await waitForEvents(createdAlert.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`
      );

      expect(response.status).to.eql(200);

      const { statusStartDate, statusEndDate } = response.body;
      expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));

      const stableBody = omit(response.body, ['statusStartDate', 'statusEndDate', 'lastRun']);
      expect(stableBody).to.eql({
        id: createdAlert.id,
        name: 'abc',
        tags: ['foo'],
        alertTypeId: 'test.noop',
        consumer: 'alertsFixture',
        status: 'OK',
        muteAll: false,
        throttle: '1m',
        enabled: true,
        errorMessages: [],
        instances: {},
      });
    });

    it('handles no-op alert without waiting for execution event', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`
      );

      expect(response.status).to.eql(200);

      const { statusStartDate, statusEndDate } = response.body;
      expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));

      const stableBody = omit(response.body, ['statusStartDate', 'statusEndDate', 'lastRun']);
      expect(stableBody).to.eql({
        id: createdAlert.id,
        name: 'abc',
        tags: ['foo'],
        alertTypeId: 'test.noop',
        consumer: 'alertsFixture',
        status: 'OK',
        muteAll: false,
        throttle: '1m',
        enabled: true,
        errorMessages: [],
        instances: {},
      });
    });

    it('handles dateStart parameter', async () => {
      const dateStart = '2020-08-08T08:08:08.008Z';
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await waitForEvents(createdAlert.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${
          createdAlert.id
        }/_instance_summary?dateStart=${dateStart}`
      );
      expect(response.status).to.eql(200);
      const { statusStartDate, statusEndDate } = response.body;
      expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));
      expect(statusStartDate).to.be(dateStart);
    });

    it('handles invalid dateStart parameter', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await waitForEvents(createdAlert.id, ['execute']);
      const dateStart = 'X0X0-08-08T08:08:08.008Z';
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${
          createdAlert.id
        }/_instance_summary?dateStart=${dateStart}`
      );
      expect(response.status).to.eql(400);
      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid date for parameter dateStart: "X0X0-08-08T08:08:08.008Z"',
      });
    });

    it('handles muted instances', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await alertUtils.muteInstance(createdAlert.id, '1');
      await waitForEvents(createdAlert.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`
      );

      expect(response.status).to.eql(200);
      expect(response.body.instances).to.eql({
        '1': {
          status: 'OK',
          muted: true,
        },
      });
    });

    it('handles alert errors', async () => {
      const dateNow = Date.now();
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ alertTypeId: 'test.throw' }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await waitForEvents(createdAlert.id, ['execute']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`
      );
      const { errorMessages } = response.body;
      expect(errorMessages.length).to.be.greaterThan(0);
      const errorMessage = errorMessages[0];
      expect(Date.parse(errorMessage.date)).to.be.greaterThan(dateNow);
      expect(errorMessage.message).to.be('this alert is intended to fail');
    });

    it('handles multi-instance status', async () => {
      // pattern of when the alert should fire
      const pattern = {
        instanceA: [true, true, true, true],
        instanceB: [true, true, false, false],
        instanceC: [true, true, true, true],
      };

      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.patternFiring',
            params: { pattern },
            schedule: { interval: '1s' },
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await alertUtils.muteInstance(createdAlert.id, 'instanceC');
      await alertUtils.muteInstance(createdAlert.id, 'instanceD');
      await waitForEvents(createdAlert.id, ['new-instance', 'resolved-instance']);
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`
      );

      const actualInstances = response.body.instances;
      const expectedInstances = {
        instanceA: {
          status: 'Active',
          muted: false,
          activeStartDate: actualInstances.instanceA.activeStartDate,
        },
        instanceB: {
          status: 'OK',
          muted: false,
        },
        instanceC: {
          status: 'Active',
          muted: true,
          activeStartDate: actualInstances.instanceC.activeStartDate,
        },
        instanceD: {
          status: 'OK',
          muted: true,
        },
      };
      expect(actualInstances).to.eql(expectedInstances);
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
        actions,
      });
    });
  }
}
