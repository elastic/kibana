/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials, SupertestWithRoleScopeType } from '../../services';
import { customRoles } from './custom_roles';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const customRoleScopedSupertest = getService('customRoleScopedSupertest');
  const saml = getService('samlAuth');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';

  async function callApiAs(roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType) {
    return roleScopedSupertestWithCookieCredentials
      .get('/internal/dataset_quality/data_streams/total_docs')
      .query({
        type: 'logs',
        start,
        end,
      });
  }

  describe('Total docs', function () {
    // This disables the forward-compatibility test for Kibana 8.19 with ES upgraded to 9.0.
    // These versions are not expected to work together.
    // The tests raise "unknown index privilege [read_failure_store]" error in ES 9.0.
    this.onlyEsVersion('8.19 || >=9.1');

    let supertestNoAccessWithCookieCredentials: SupertestWithRoleScopeType;
    let roleAuthc: RoleCredentials;

    before(async () => {
      await saml.setCustomRole(customRoles.noAccessUserRole);
      supertestNoAccessWithCookieCredentials =
        await customRoleScopedSupertest.getSupertestWithCustomRoleScope({
          useCookieHeader: true,
          withInternalHeaders: true,
        });
      roleAuthc = await saml.createM2mApiKeyWithCustomRoleScope();
    });

    after(async () => {
      await saml.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await saml.deleteCustomRole();
    });

    it('should return a 403 when the user does not have sufficient privileges', async () => {
      const res = await callApiAs(supertestNoAccessWithCookieCredentials);
      expect(res.statusCode).to.be(403);
    });
  });
}
