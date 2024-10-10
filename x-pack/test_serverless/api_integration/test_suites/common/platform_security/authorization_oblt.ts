/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

/*
 * This file contains the authorization tests only for observability
 * projects. Custom roles are not enabled in OBLT projects so endpoints
 * related to creating roles are disabled
 */

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;

  describe('security/authorization', function () {
    this.tags(['skipSvlSearch', 'skipSvlSec']);

    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
        }
      );
      supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withCommonHeaders: true,
      });
    });

    after(async () => {
      await supertestAdminWithApiKey.destroy();
    });

    describe('route access', () => {
      describe('disabled', () => {
        it('create/update role', async () => {
          const { body, status } = await supertestAdminWithApiKey.put('/api/security/role/test');
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get role', async () => {
          const { body, status } = await supertestAdminWithApiKey.get(
            '/api/security/role/superuser'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get all roles', async () => {
          const { body, status } = await supertestAdminWithApiKey.get('/api/security/role');
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('delete role', async () => {
          const { body, status } = await supertestAdminWithApiKey.delete(
            '/api/security/role/superuser'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get all privileges', async () => {
          const { body, status } = await supertestAdminWithApiKey.get('/api/security/privileges');
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get built-in elasticsearch privileges', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/esPrivileges/builtin'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
