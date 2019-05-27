/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('encrypted attributes', () => {
    before(() => esArchiver.load('actions/basic'));
    after(() => esArchiver.unload('actions/basic'));

    it('decrypts attributes and joins on actionTypeConfig when firing', async () => {
      await supertest
        .post(`/api/action/85c2d74a-a306-4d53-9c91-06773fbca869/fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            foo: true,
            bar: false,
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            success: true,
            actionTypeConfig: {
              unencrypted: 'unencrypted text',
              encrypted: 'something encrypted',
            },
            params: {
              foo: true,
              bar: false,
            },
          });
        });
    });
  });
}
