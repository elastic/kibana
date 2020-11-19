/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create email action', () => {
    it('should return 403 when creating an email action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
          config: {
            service: '__json',
            from: 'bob@example.com',
          },
          secrets: {
            user: 'bob',
            password: 'supersecret',
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .email is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
