/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function getActionTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    before(() => esArchiver.load('alerting/basic'));
    after(() => esArchiver.unload('alerting/basic'));

    it('should return 200 when finding a record and not return encrypted attributes', async () => {
      await supertest
        .get('/api/action/1')
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            id: '1',
            type: 'action',
            references: [],
            version: resp.body.version,
            attributes: {
              actionTypeId: 'test',
              description: 'My description',
              actionTypeConfig: {
                unencrypted: 'unencrypted text',
              },
            },
          });
        });
    });

    it('should return 404 when not finding a record', async () => {
      await supertest
        .get('/api/action/2')
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
