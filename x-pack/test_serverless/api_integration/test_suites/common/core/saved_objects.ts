/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('Blocked internal SO API', () => {
    const apis = [
      {
        path: '/api/saved_objects/_bulk_create',
        method: 'post' as const,
      },
      {
        path: '/api/saved_objects/_bulk_delete',
        method: 'post' as const,
      },
      {
        path: '/api/saved_objects/_bulk_get',
        method: 'post' as const,
      },
      {
        path: '/api/saved_objects/_bulk_resolve',
        method: 'post' as const,
      },
      {
        path: '/api/saved_objects/_bulk_update',
        method: 'post' as const,
      },
      {
        path: '/api/saved_objects/test/id',
        method: 'get' as const,
      },
      {
        path: '/api/saved_objects/test/id',
        method: 'post' as const,
      },
      {
        path: '/api/saved_objects/test/id',
        method: 'delete' as const,
      },
      {
        path: '/api/saved_objects/_find',
        method: 'get' as const,
      },
      {
        path: '/api/saved_objects/test/id',
        method: 'put' as const,
      },
    ];

    for (const { path, method } of apis) {
      it(`${method} ${path}`, async () => {
        const { body } = await supertest[method](path)
          .set(svlCommonApi.getCommonRequestHeader())
          .expect(400);

        expect(body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: `uri [${path}] with method [${method}] exists but is not available with the current configuration`,
        });
      });
    }
  });
}
