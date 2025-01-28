/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create email connector', () => {
    it('should return 403 when creating an email connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An email connector',
          connector_type_id: '.email',
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

    it('should not execute a pre-configured email connector because of license', async () => {
      await supertest
        .post('/api/actions/connector/my-test-email/_execute')
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to: 'someone@example.com',
            subject: 'testing',
            message: 'still testing',
          },
        })
        .expect(403, {
          error: 'Forbidden',
          message:
            'Action type .email is disabled because your basic license does not support it. Please upgrade your license.',
          statusCode: 403,
        });
    });
  });
}
