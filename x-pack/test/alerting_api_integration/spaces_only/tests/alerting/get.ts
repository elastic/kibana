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
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle get alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alert/${createdAlert.id}`
      );

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({
        id: createdAlert.id,
        name: 'abc',
        tags: ['foo'],
        alertTypeId: 'test.noop',
        consumer: 'bar',
        schedule: { interval: '1m' },
        enabled: true,
        actions: [],
        params: {},
        createdBy: null,
        scheduledTaskId: response.body.scheduledTaskId,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        createdAt: response.body.createdAt,
        updatedAt: response.body.updatedAt,
      });
      expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
      expect(response.body.updatedAt).to.eql(null);
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      await supertest
        .get(`${getUrlPrefix(Spaces.other.id)}/api/alert/${createdAlert.id}`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    it(`should handle get alert request appropriately when alert doesn't exist`, async () => {
      await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/alert/1`).expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: 'Saved object [alert/1] not found',
      });
    });
  });
}
