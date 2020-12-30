/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serverLogTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('server-log action', () => {
    it('should return 200 when creating a server-log action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A server.log action',
          actionTypeId: '.server-log',
        })
        .expect(200);
    });
  });
}
