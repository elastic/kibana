/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function deleteActionTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('delete', () => {
    beforeEach(() => esArchiver.load('actions/basic'));
    afterEach(() => esArchiver.unload('actions/basic'));

    it('should return 200 when deleting an action', async () => {
      await supertest
        .delete('/api/action/8978428d-6890-43f7-b4a6-e7a4064c33f7')
        .set('kbn-xsrf', 'foo')
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({});
        });
    });

    it(`should return 404 when action doesn't exist`, async () => {
      await supertest
        .delete('/api/action/2')
        .set('kbn-xsrf', 'foo')
        .expect(404)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [action/2] not found',
          });
        });
    });
  });
}
