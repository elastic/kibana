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

  describe('find_action', () => {
    before(() => esArchiver.load('alerting/basic'));
    after(() => esArchiver.unload('alerting/basic'));

    it('should return 200 with individual responses', async () => {
      await supertest
        .get('/api/alerting/action/_find?fields=description')
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            page: 1,
            per_page: 20,
            total: 1,
            saved_objects: [
              {
                id: '1',
                type: 'action',
                version: resp.body.saved_objects[0].version,
                references: [],
                attributes: {
                  description: 'My description',
                },
              },
            ],
          });
        });
    });
  });
}
