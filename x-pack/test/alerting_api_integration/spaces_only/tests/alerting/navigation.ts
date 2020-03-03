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

  describe('navigation', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle get alert navigation request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.noop',
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alert/${createdAlert.id}/navigation`
      );

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.eql({
        url: 'about:blank',
      });
    });

    it('should handle get alert navigation request when there is no navigation appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.always-firing',
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alert/${createdAlert.id}/navigation`
      );

      expect(response.statusCode).to.eql(204);
    });

    it(`shouldn't get navigation for an alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      await supertest
        .get(`${getUrlPrefix(Spaces.other.id)}/api/alert/${createdAlert.id}/navigation`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    it(`should handle get alert navigation request appropriately when alert doesn't exist`, async () => {
      await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/alert/1/navigation`).expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: 'Saved object [alert/1] not found',
      });
    });
  });
}
