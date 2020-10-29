/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('aggregate', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should aggregate when there are no alerts', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/_aggregate`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        alertExecutionStatus: {
          ok: 0,
          active: 0,
          error: 0,
          pending: 0,
          unknown: 0,
        },
      });
    });

    it('should aggregate alert status totals', async () => {
      const NumOkAlerts = 1;
      const NumActiveAlerts = 2;

      for (let i = 0; i < NumOkAlerts; i++) {
        const okAlertId = await createTestAlert(
          {
            alertTypeId: 'test.noop',
            schedule: { interval: '1s' },
          },
          'ok'
        );
        objectRemover.add(Spaces.space1.id, okAlertId, 'alert', 'alerts');
      }

      for (let i = 0; i < NumActiveAlerts; i++) {
        const activeAlertId = await createTestAlert(
          {
            alertTypeId: 'test.patternFiring',
            schedule: { interval: '1s' },
            params: {
              pattern: { instance: new Array(100).fill(true) },
            },
          },
          'active'
        );
        objectRemover.add(Spaces.space1.id, activeAlertId, 'alert', 'alerts');
      }

      const reponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/_aggregate`
      );

      expect(reponse.status).to.eql(200);
      expect(reponse.body).to.eql({
        alertExecutionStatus: {
          ok: NumOkAlerts,
          active: NumActiveAlerts,
          error: 0,
          pending: 0,
          unknown: 0,
        },
      });
    });
  });

  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 20000
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

  async function delay(millis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, millis));
  }

  async function createTestAlert(testAlertOverrides = {}, status: string) {
    const { body: createdAlert } = await supertest
      .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
      .set('kbn-xsrf', 'foo')
      .send(getTestAlertData(testAlertOverrides))
      .expect(200);

    await waitForStatus(createdAlert.id, new Set([status]));
    return createdAlert.id;
  }
}
