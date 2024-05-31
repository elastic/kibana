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

  describe('security/authorization', function () {
    describe('route access', () => {
      describe('internal', () => {
        describe('disabled', () => {
          it('get all privileges', async () => {
            const { body, status } = await supertest
              .get('/api/security/privileges')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get built-in elasticsearch privileges', async () => {
            const { body, status } = await supertest
              .get('/internal/security/esPrivileges/builtin')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('create/update role', async () => {
            const { body, status } = await supertest
              .put('/api/security/role/test')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get role', async () => {
            const { body, status } = await supertest
              .get('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get all roles', async () => {
            const { body, status } = await supertest
              .get('/api/security/role')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('delete role', async () => {
            const { body, status } = await supertest
              .delete('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get shared saved object permissions', async () => {
            const { body, status } = await supertest
              .get('/internal/security/_share_saved_object_permissions')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });
        });
      });

      describe('public', () => {
        it('reset session page', async () => {
          const { status } = await supertest
            .get('/internal/security/reset_session_page.js')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });
      });
    });
  });
}
