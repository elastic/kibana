/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('security/sessions', function () {
    describe('route access', () => {
      describe('disabled', () => {
        it('invalidate', async () => {
          const { body, status } = await supertest
            .post('/api/security/session/_invalidate')
            .set(svlCommonApi.getInternalRequestHeader())
            .send({ match: 'all' });
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('internal', () => {
        it('get session info', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertest
            .get('/internal/security/session')
            .set(svlCommonApi.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertest
            .get('/internal/security/session')
            .set(svlCommonApi.getInternalRequestHeader()));
          // expect 204 because there is no session
          expect(status).toBe(204);
        });

        it('extend', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertest
            .post('/internal/security/session')
            .set(svlCommonApi.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertest
            .post('/internal/security/session')
            .set(svlCommonApi.getInternalRequestHeader()));
          // expect redirect
          expect(status).toBe(302);
        });
      });
    });
  });
}
