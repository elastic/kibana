/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serverLogTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('server-log action', () => {
    after(() => esArchiver.unload('empty_kibana'));

    let serverLogActionId: string;

    it('should return 200 when creating a builtin server-log action', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'A server.log action',
          actionTypeId: '.server-log',
        })
        .expect(200);

      serverLogActionId = createdAction.id;
      expect(createdAction).to.eql({
        id: createdAction.id,
        description: 'A server.log action',
        actionTypeId: '.server-log',
        config: {},
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        description: 'A server.log action',
        actionTypeId: '.server-log',
        config: {},
      });
    });

    it('should handle firing the action', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${serverLogActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'message posted by firing an action during a test',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });
  });
}
