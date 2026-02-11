/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import rison from '@kbn/rison';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials, SupertestWithRoleScopeType } from '../../services';
import { customRoles } from './custom_roles';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const customRoleScopedSupertest = getService('customRoleScopedSupertest');
  const saml = getService('samlAuth');

  async function callApiAs(
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType,
    types: Array<'logs' | 'metrics' | 'traces' | 'synthetics'> = ['logs']
  ) {
    return roleScopedSupertestWithCookieCredentials
      .get('/internal/dataset_quality/data_streams/types_privileges')
      .query({
        types: rison.encodeArray(types),
      });
  }

  describe('Types privileges', function () {
    // This disables the forward-compatibility test for Kibana 8.19 with ES upgraded to 9.0.
    // These versions are not expected to work together.
    // The tests raise "unknown index privilege [read_failure_store]" error in ES 9.0.
    this.onlyEsVersion('8.19 || >=9.1');

    const noPrivileges = {
      canRead: false,
      canMonitor: false,
      canReadFailureStore: false,
      canManageFailureStore: false,
    };

    const fullPrivileges = {
      canRead: true,
      canMonitor: true,
      canReadFailureStore: true,
      canManageFailureStore: true,
    };

    describe('No access user', () => {
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

      it('returns no privileges for noAccessUser with single type', async () => {
        const resp = await callApiAs(supertestNoAccessWithCookieCredentials, ['logs']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(noPrivileges);
      });

      it('returns no privileges for noAccessUser with multiple types', async () => {
        const resp = await callApiAs(supertestNoAccessWithCookieCredentials, ['logs', 'metrics']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(noPrivileges);
        expect(resp.body.datasetTypesPrivileges['metrics-*-*']).to.eql(noPrivileges);
      });
    });

    describe('Admin user', () => {
      let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

      before(async () => {
        supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'admin',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      it('returns correct privileges for adminUser with single type', async () => {
        const resp = await callApiAs(supertestAdminWithCookieCredentials, ['logs']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(fullPrivileges);
      });

      it('returns correct privileges for adminUser with multiple types', async () => {
        const resp = await callApiAs(supertestAdminWithCookieCredentials, [
          'logs',
          'metrics',
          'traces',
        ]);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['metrics-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['traces-*-*']).to.eql(fullPrivileges);
      });

      it('returns correct privileges for adminUser with all types', async () => {
        const resp = await callApiAs(supertestAdminWithCookieCredentials, [
          'logs',
          'metrics',
          'traces',
          'synthetics',
        ]);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['metrics-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['traces-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['synthetics-*-*']).to.eql(fullPrivileges);
      });

      it('returns expected structure for response', async () => {
        const resp = await callApiAs(supertestAdminWithCookieCredentials, ['logs']);

        expect(resp.body).to.have.property('datasetTypesPrivileges');
        expect(resp.body.datasetTypesPrivileges).to.be.an('object');
        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.have.property('canRead');
        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.have.property('canMonitor');
        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.have.property(
          'canReadFailureStore'
        );
      });
    });
  });
}
