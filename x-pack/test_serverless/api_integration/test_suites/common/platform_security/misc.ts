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

  describe('security/misc', function () {
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
        it('get index fields', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials
            .get('/internal/security/fields/test')
            .send({ params: 'params' });
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('fix deprecated roles', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.post(
            '/internal/security/deprecations/kibana_user_role/_fix_users'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('fix deprecated roleAuthc mappings', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.post(
            '/internal/security/deprecations/kibana_user_role/_fix_role_mappings'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get security checkup state', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/security_checkup/state'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('internal', () => {
        it('get record auth type', async () => {
          const { status } = await supertestAdminWithCookieCredentials.post(
            '/internal/security/analytics/_record_auth_type'
          );
          expect(status).toBe(200);
        });
      });
    });
  });
}
