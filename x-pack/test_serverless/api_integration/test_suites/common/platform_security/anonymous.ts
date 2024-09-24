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

  describe('security/anonymous', function () {
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
        it('get access capabilities', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/anonymous_access/capabilities'
          );

          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get access state', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/anonymous_access/state'
          );

          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
