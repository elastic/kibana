/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  ensureDatetimesAreOrdered,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function executionStatusAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('executionStatus', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(async () => await objectRemover.removeAll());

    it('should be "pending" for newly created alert', async () => {
      const dateStart = Date.now();
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData());
      const dateEnd = Date.now();
      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert', 'alerts');

      expect(response.body.executionStatus).to.be.ok();
      const { status, lastExecutionDate, error } = response.body.executionStatus;
      expect(status).to.be('pending');
      ensureDatetimesAreOrdered([dateStart, lastExecutionDate, dateEnd]);
      expect(error).not.to.be.ok();

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should eventually be "ok" for no-op alert', async () => {
      const dates = [];
      dates.push(Date.now());
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.noop',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      dates.push(response.body.executionStatus.lastExecutionDate);
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['ok']));
      dates.push(executionStatus.lastExecutionDate);
      dates.push(Date.now());
      ensureDatetimesAreOrdered(dates);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should eventually be "active" for firing alert', async () => {
      const dates = [];
      dates.push(Date.now());
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.patternFiring',
            schedule: { interval: '1s' },
            params: {
              pattern: { instance: trues(100) },
            },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      dates.push(response.body.executionStatus.lastExecutionDate);
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['active']));
      dates.push(executionStatus.lastExecutionDate);
      dates.push(Date.now());
      ensureDatetimesAreOrdered(dates);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should eventually be "error" for an error alert', async () => {
      const dates = [];
      dates.push(Date.now());
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      dates.push(response.body.executionStatus.lastExecutionDate);
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['error']));
      dates.push(executionStatus.lastExecutionDate);
      dates.push(Date.now());
      ensureDatetimesAreOrdered(dates);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    // not sure how to test the read error reason!

    // note the decrypt error reason is tested in security_and_spaces, can't be tested
    // without security on

    it('should eventually have error reason "execute" when appropriate', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['error']));
      expect(executionStatus.error).to.be.ok();
      expect(executionStatus.error.reason).to.be('execute');
      expect(executionStatus.error.message).to.be('this alert is intended to fail');
    });

    it('should eventually have error reason "unknown" when appropriate', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.validation',
            schedule: { interval: '1s' },
            params: { param1: 'valid now, but will change to a number soon!' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      let executionStatus = await waitForStatus(alertId, new Set(['ok']));

      // break the validation of the params
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/saved_object/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            params: { param1: 42 },
          },
        })
        .expect(200);

      executionStatus = await waitForStatus(alertId, new Set(['error']));
      expect(executionStatus.error).to.be.ok();
      expect(executionStatus.error.reason).to.be('unknown');

      const message = 'params invalid: [param1]: expected value of type [string] but got [number]';
      expect(executionStatus.error.message).to.be(message);
    });

    it('should be able to find over all the fields', async () => {
      const startDate = Date.now();
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(createResponse.status).to.eql(200);
      const alertId = createResponse.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      await waitForStatus(alertId, new Set(['error']));

      let filter = `lastExecutionDate>${startDate}`;
      let executionStatus = await waitForFindStatus(alertId, new Set(['error']), filter);
      expectErrorExecutionStatus(executionStatus, startDate);

      filter = `status:error`;
      executionStatus = await waitForFindStatus(alertId, new Set(['error']), filter);
      expectErrorExecutionStatus(executionStatus, startDate);

      filter = `error.message:*intended*`;
      executionStatus = await waitForFindStatus(alertId, new Set(['error']), filter);
      expectErrorExecutionStatus(executionStatus, startDate);

      filter = `error.reason:execute`;
      executionStatus = await waitForFindStatus(alertId, new Set(['error']), filter);
      expectErrorExecutionStatus(executionStatus, startDate);
    });
  });

  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(
      `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${id}`
    );
    expect(response.status).to.eql(200);

    const { executionStatus } = response.body || {};
    const { status } = executionStatus || {};

    const message = `waitForStatus(${Array.from(statuses)}): got ${JSON.stringify(
      executionStatus
    )}`;

    if (statuses.has(status)) {
      return executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }

  async function waitForFindStatus(
    id: string,
    statuses: Set<string>,
    filter: string,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for find alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const findUri = getFindUri(filter);
    const response = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/${findUri}`);

    expect(response.status).to.eql(200);
    const { executionStatus } = response.body.data.find((obj: any) => obj.id === id) || {};
    const { status } = executionStatus || {};

    const message = `waitForFindStatus(${Array.from(statuses)}): got ${JSON.stringify(
      executionStatus
    )}`;

    if (statuses.has(status)) {
      return executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }
}

function expectErrorExecutionStatus(executionStatus: Record<string, any>, startDate: number) {
  expect(executionStatus).to.be.ok();
  expect(executionStatus.status).to.equal('error');

  const statusDate = Date.parse(executionStatus.lastExecutionDate);
  const stopDate = Date.now();
  expect(startDate).to.be.lessThan(statusDate);
  expect(stopDate).to.be.greaterThan(statusDate);

  expect(executionStatus.error.message).to.equal('this alert is intended to fail');
  expect(executionStatus.error.reason).to.equal('execute');
}

function getFindUri(filter: string) {
  return `api/alerts/_find?filter=alert.attributes.executionStatus.${filter}`;
}

function trues(length: number): boolean[] {
  return new Array(length).fill(true);
}

async function delay(millis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, millis));
}
