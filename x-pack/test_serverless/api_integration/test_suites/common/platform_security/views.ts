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
  const svlCommonApi = getService('svlCommonApi');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;

  describe('security/views', function () {
    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    describe('route access', () => {
      describe('disabled', () => {
        // ToDo: unskip these when we disable login routes
        xit('login', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get('/login');
          svlCommonApi.assertApiNotFound(body, status);
        });

        // ToDo: unskip these when we disable login routes
        xit('get login state', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/login_state'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('access agreement', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/security/access_agreement'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get access agreement state', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/access_agreement/state'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('public', () => {
        it('login', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get('/login');
          expect(status).toBe(302);
        });

        it('get login state', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/login_state'
          );
          expect(status).toBe(200);
        });

        it('capture URL', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/capture-url'
          );
          expect(status).toBe(200);
        });

        it('space selector', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/spaces/space_selector'
          );
          expect(status).toBe(200);
        });

        it('enter space', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get('/spaces/enter');
          expect(status).toBe(302);
        });

        it('account', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get('/security/account');
          expect(status).toBe(200);
        });

        it('logged out', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get('/security/logged_out');
          expect(status).toBe(302);
        });

        it('logout', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get('/logout');
          expect(status).toBe(200);
        });

        it('overwritten session', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/security/overwritten_session'
          );
          expect(status).toBe(200);
        });
      });
    });
  });
}
