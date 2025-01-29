/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  describe('security/role_mappings', function () {
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
        it('create/update roleAuthc mapping', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.post(
            '/internal/security/role_mapping/test'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get roleAuthc mapping', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/role_mapping/test'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get all roleAuthc mappings', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/role_mapping'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('delete roleAuthc mapping', async () => {
          // this test works because the message for a missing endpoint is different from a missing roleAuthc mapping
          const { body, status } = await supertestAdminWithCookieCredentials.delete(
            '/internal/security/role_mapping/test'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
