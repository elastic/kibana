/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover, getTestAlertData } from '../../../common/lib';
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
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/state`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.key('alertInstances', 'previousStartedAt');
    });

    it('should fetch updated state', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send({
          enabled: true,
          name: 'abc',
          tags: ['foo'],
          alertTypeId: 'test.cumulative-firing',
          consumer: 'bar',
          schedule: { interval: '5s' },
          throttle: '5s',
          actions: [],
          params: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

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
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}/state`
      );

      expect(response.body.alertTypeState.runCount).to.greaterThan(0);

      const alertInstances = Object.entries<Record<string, any>>(response.body.alertInstances);
      expect(alertInstances.length).to.eql(response.body.alertTypeState.runCount);
      alertInstances.forEach(([key, value], index) => {
        expect(key).to.eql(`instance-${index}`);
        expect(value.state).to.eql({ instanceStateValue: true });
      });
    });

    it(`should handle getAlertState request appropriately when alert doesn't exist`, async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/1/state`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });
  });
}
