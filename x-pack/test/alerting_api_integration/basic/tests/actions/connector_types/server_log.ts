/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serverLogTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('server-log connector', () => {
    it('should return 200 when creating a server-log connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A server.log connector',
          connector_type_id: '.server-log',
        })
        .expect(200);
    });
  });
}
