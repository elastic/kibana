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

  describe('security/views', function () {
    describe('route access', () => {
      describe('disabled', () => {
        // ToDo: uncomment these when we disable login routes
        // it('login', async () => {
        //   const { body, status } = await supertest
        //     .get('/login')
        //     .set(svlCommonApi.getInternalRequestHeader());
        //   svlCommonApi.assertApiNotFound(body, status);
        // });

        // it('get login state', async () => {
        //   const { body, status } = await supertest
        //     .get('/internal/security/login_state')
        //     .set(svlCommonApi.getInternalRequestHeader());
        //   svlCommonApi.assertApiNotFound(body, status);
        // });

        it('access agreement', async () => {
          const { body, status } = await supertest
            .get('/security/access_agreement')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get access agreement state', async () => {
          const { body, status } = await supertest
            .get('/internal/security/access_agreement/state')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('public', () => {
        it('login', async () => {
          const { status } = await supertest
            .get('/login')
            .set(svlCommonApi.getInternalRequestHeader());
          expect(status).toBe(302);
        });

        it('get login state', async () => {
          const { status } = await supertest
            .get('/internal/security/login_state')
            .set(svlCommonApi.getInternalRequestHeader());
          expect(status).toBe(200);
        });

        it('capture URL', async () => {
          const { status } = await supertest
            .get('/internal/security/capture-url')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });

        it('space selector', async () => {
          const { status } = await supertest
            .get('/spaces/space_selector')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });

        it('enter space', async () => {
          const { status } = await supertest
            .get('/spaces/enter')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(302);
        });

        it('account', async () => {
          const { status } = await supertest
            .get('/security/account')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });

        it('logged out', async () => {
          const { status } = await supertest
            .get('/security/logged_out')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });

        it('logout', async () => {
          const { status } = await supertest
            .get('/logout')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });

        it('overwritten session', async () => {
          const { status } = await supertest
            .get('/security/overwritten_session')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });
      });
    });
  });
}
