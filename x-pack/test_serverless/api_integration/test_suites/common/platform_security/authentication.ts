/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const svlCommonApi = getService('svlCommonApi');
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;
  let supertestViewerWithApiKey: SupertestWithRoleScopeType;
  let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

  describe('security/authentication', function () {
    before(async () => {
      supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      supertestViewerWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('viewer');
      supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'viewer',
        {
          useCookieHeader: true,
          withCommonHeaders: true,
        }
      );
    });
    after(async () => {
      await supertestAdminWithApiKey.destroy();
      await supertestViewerWithApiKey.destroy();
      await supertestViewerWithCookieCredentials.destroy();
    });
    describe('route access', () => {
      describe('disabled', () => {
        // ToDo: uncomment when we disable login
        // it('login', async () => {
        //   const { body, status } = await supertestAdminWithApiKey
        //     .post('/internal/security/login');
        //   svlCommonApi.assertApiNotFound(body, status);
        // });

        it('logout (deprecated)', async () => {
          const { body, status } = await supertestAdminWithApiKey
            .get('/api/security/v1/logout')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get current user (deprecated)', async () => {
          const { body, status } = await supertestAdminWithApiKey
            .get('/internal/security/v1/me')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('acknowledge access agreement', async () => {
          const { body, status } = await supertestAdminWithApiKey
            .post('/internal/security/access_agreement/acknowledge')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        describe('OIDC', () => {
          it('OIDC implicit', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .get('/api/security/oidc/implicit')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC implicit (deprecated)', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .get('/api/security/v1/oidc/implicit')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC implicit.js', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .get('/internal/security/oidc/implicit.js')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC callback', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .get('/api/security/oidc/callback')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC callback (deprecated)', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .get('/api/security/v1/oidc')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC login', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .post('/api/security/oidc/initiate_login')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC login (deprecated)', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .post('/api/security/v1/oidc')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('OIDC 3rd party login', async () => {
            const { body, status } = await supertestAdminWithApiKey
              .get('/api/security/oidc/initiate_login')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });
        });

        it('SAML callback (deprecated)', async () => {
          const { body, status } = await supertestAdminWithApiKey
            .post('/api/security/v1/saml')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('internal', () => {
        it('get current user', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestViewerWithCookieCredentials.get(
            '/internal/security/me'
          ));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestViewerWithCookieCredentials
            .get('/internal/security/me')
            .set(svlCommonApi.getInternalRequestHeader()));
          // expect success because we're using the internal header
          expect(body).toEqual(
            expect.objectContaining({
              authentication_provider: { name: 'cloud-saml-kibana', type: 'saml' },
              authentication_type: 'token',
              authentication_realm: {
                name: 'cloud-saml-kibana',
                type: 'saml',
              },
              enabled: true,
              roles: [expect.stringContaining('viewer')],
            })
          );
          expect(status).toBe(200);
        });

        // ToDo: remove when we disable login
        it('login', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestViewerWithCookieCredentials.post(
            '/internal/security/login'
          ));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestViewerWithCookieCredentials
            .post('/internal/security/login')
            .set(svlCommonApi.getInternalRequestHeader()));
          expect(status).not.toBe(404);
        });
      });

      describe('public', () => {
        it('logout', async () => {
          const { status } = await supertestViewerWithApiKey.get('/api/security/logout');
          expect(status).toBe(302);
        });

        it('SAML callback', async () => {
          const { body, status } = await supertestViewerWithApiKey
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
