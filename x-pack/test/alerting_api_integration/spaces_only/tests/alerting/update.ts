/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle update alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      const updatedData = {
        name: 'bcd',
        tags: ['bar'],
        params: {
          foo: true,
        },
        schedule: { interval: '12s' },
        actions: [],
        throttle: '1m',
      };
      const response = await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send(updatedData)
        .expect(200);

      expect(response.body).to.eql({
        ...updatedData,
        id: createdAlert.id,
        tags: ['bar'],
        alertTypeId: 'test.noop',
        consumer: 'bar',
        createdBy: null,
        enabled: true,
        updatedBy: null,
        apiKeyOwner: null,
        muteAll: false,
        mutedInstanceIds: [],
        scheduledTaskId: createdAlert.scheduledTaskId,
        createdAt: response.body.createdAt,
        updatedAt: response.body.updatedAt,
      });
      expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(
        Date.parse(response.body.createdAt)
      );

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    it(`shouldn't update alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await supertest
        .put(`${getUrlPrefix(Spaces.other.id)}/api/alerts/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'bcd',
          tags: ['foo'],
          params: {
            foo: true,
          },
          schedule: { interval: '12s' },
          actions: [],
          throttle: '1m',
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });
  });
}
