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
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'A server.log action',
            actionTypeId: '.server-log',
            actionTypeConfig: {},
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        type: 'action',
        id: fetchedAction.id,
        attributes: {
          description: 'A server.log action',
          actionTypeId: '.server-log',
          actionTypeConfig: {},
        },
        references: [],
        updated_at: fetchedAction.updated_at,
        version: fetchedAction.version,
      });
    });
  });
}
