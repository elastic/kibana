/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function findActionTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('find', () => {
    before(() => esArchiver.load('actions/basic'));
    after(() => esArchiver.unload('actions/basic'));

    it('should return 200 with individual responses', async () => {
      await supertest
        .get('/api/action/_find?fields=description')
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 1,
            saved_objects: [
              {
                id: '8978428d-6890-43f7-b4a6-e7a4064c33f7',
                type: 'action',
                version: resp.body.saved_objects[0].version,
                references: [],
                attributes: {
                  description: 'My action',
                },
              },
            ],
          });
        });
    });

    it('should not return encrypted attributes', async () => {
      await supertest
        .get('/api/action/_find')
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 1,
            saved_objects: [
              {
                id: '8978428d-6890-43f7-b4a6-e7a4064c33f7',
                type: 'action',
                version: resp.body.saved_objects[0].version,
                references: [],
                attributes: {
                  description: 'My action',
                  actionTypeId: 'test',
                  actionTypeConfig: {
                    unencrypted: 'unencrypted text',
                  },
                },
              },
            ],
          });
        });
    });
  });
}
