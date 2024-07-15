/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const config = getService('config');

  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  describe('security/authentication', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    describe('route access', () => {
      describe('disabled', () => {
        // ToDo: uncomment when we disable login
        // it('login', async () => {
        //   const { body, status } = await supertestWithoutAuth
        //     .post('/internal/security/login')
        //     .set(svlCommonApi.getInternalRequestHeader()).set(roleAuthc.apiKeyHeader)
        //   svlCommonApi.assertApiNotFound(body, status);
        // });

        it('logout (deprecated)', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/api/security/v1/logout')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get current user (deprecated)', async () => {
          const { body, status } = await supertest
            .get('/internal/security/v1/me')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('acknowledge access agreement', async () => {
          const { body, status } = await supertest
            .post('/internal/security/access_agreement/acknowledge')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        describe('OIDC', () => {
          it('OIDC implicit', async () => {
            const { body, status } = await supertest
              .get('/api/security/oidc/implicit')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC implicit (deprecated)', async () => {
            const { body, status } = await supertest
              .get('/api/security/v1/oidc/implicit')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC implicit.js', async () => {
            const { body, status } = await supertest
              .get('/internal/security/oidc/implicit.js')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC callback', async () => {
            const { body, status } = await supertest
              .get('/api/security/oidc/callback')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC callback (deprecated)', async () => {
            const { body, status } = await supertest
              .get('/api/security/v1/oidc')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC login', async () => {
            const { body, status } = await supertest
              .post('/api/security/oidc/initiate_login')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC login (deprecated)', async () => {
            const { body, status } = await supertest
              .post('/api/security/v1/oidc')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC 3rd party login', async () => {
            const { body, status } = await supertest
              .get('/api/security/oidc/initiate_login')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });
        });

        it('SAML callback (deprecated)', async () => {
          const { body, status } = await supertest
            .post('/api/security/v1/saml')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('internal', () => {
        it('get current user', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertest
            .get('/internal/security/me')
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
            .get('/internal/security/me')
            .set(svlCommonApi.getInternalRequestHeader()));
          // expect success because we're using the internal header
          expect(body).toEqual({
            authentication_provider: { name: '__http__', type: 'http' },
            authentication_realm: { name: 'file1', type: 'file' },
            authentication_type: 'realm',
            elastic_cloud_user: false,
            email: null,
            enabled: true,
            full_name: null,
            lookup_realm: { name: 'file1', type: 'file' },
            metadata: {},
            operator: true,
            roles: ['superuser'],
            username: config.get('servers.kibana.username'),
          });
          expect(status).toBe(200);
        });

        // ToDo: remove when we disable login
        it('login', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertest
            .post('/internal/security/login')
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
            .post('/internal/security/login')
            .set(svlCommonApi.getInternalRequestHeader()));
          expect(status).not.toBe(404);
        });
      });

      describe('public', () => {
        it('logout', async () => {
          const { status } = await supertest.get('/api/security/logout');
          expect(status).toBe(302);
        });

        it('SAML callback', async () => {
          const { body, status } = await supertest
            .post('/api/security/saml/callback')
            .set(svlCommonApi.getCommonRequestHeader())
            .send({
              SAMLResponse: '',
            });

          // Should fail with 401 (not 404) because there is no valid SAML response in the request body
          expect(body).toEqual({
            error: 'Unauthorized',
            message: 'Unauthorized',
            statusCode: 401,
          });
          expect(status).not.toBe(404);
        });
      });
    });
  });
}
