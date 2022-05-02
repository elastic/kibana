/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serverLogTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('server-log action', () => {
    let serverLogActionId: string;

    it('should return 200 when creating a builtin server-log action', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A server.log action',
          connector_type_id: '.server-log',
        })
        .expect(200);

      serverLogActionId = createdAction.id;
      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'A server.log action',
        connector_type_id: '.server-log',
        config: {},
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'A server.log action',
        connector_type_id: '.server-log',
        is_missing_secrets: false,
        config: {},
      });
    });

    it('should handle firing the action', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${serverLogActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            level: 'info',
            message: 'message posted by firing an action during a test',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });
  });
}
