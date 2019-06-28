/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function serverLogTest({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('create server-log action', () => {
    after(() => esArchiver.unload('empty_kibana'));

    it('should return 200 when creating a builtin server-log action', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'A server.log action',
            actionTypeId: 'kibana.server-log',
            actionTypeConfig: {},
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            type: 'action',
            id: resp.body.id,
            attributes: {
              description: 'A server.log action',
              actionTypeId: 'kibana.server-log',
              actionTypeConfig: {},
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
          expect(typeof resp.body.id).to.be('string');
        });
    });
  });
}
