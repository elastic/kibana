/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

function collectSubFeaturesPrivileges(feature: KibanaFeatureConfig) {
  return new Map(
    feature.subFeatures?.flatMap((subFeature) =>
      subFeature.privilegeGroups.flatMap(({ privileges }) =>
        privileges.map(
          (privilege) => [privilege.id, privilege] as [string, SubFeaturePrivilegeConfig]
        )
      )
    ) ?? []
  );
}

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;

  describe('security/authorization', function () {
    // see details: https://github.com/elastic/kibana/issues/192282
    this.tags(['failsOnMKI']);
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
        // Skipped due to change in QA environment for role management and spaces
        // TODO: revisit once the change is rolled out to all environments
        it.skip('get all privileges', async () => {
          const { body, status } = await supertestAdminWithApiKey.get('/api/security/privileges');
          svlCommonApi.assertApiNotFound(body, status);
        });

        // Skipped due to change in QA environment for role management and spaces
        // TODO: revisit once the change is rolled out to all environments
        it.skip('get built-in elasticsearch privileges', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/esPrivileges/builtin'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        // Role CRUD APIs are gated behind the xpack.security.roleManagementEnabled config
        // setting. This setting is false by default on serverless. When the custom roles
        // feature is enabled, this setting will be true, and the tests from
        // roles_routes_feature_flag.ts can be moved here to replace these.
        it('create/update roleAuthc', async () => {
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

        it('delete roleAuthc', async () => {
          const { body, status } = await supertestAdminWithApiKey.delete(
            '/api/security/role/superuser'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get shared saved object permissions', async () => {
          const { body, status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/_share_saved_object_permissions'
          );
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('public', () => {
        it('reset session page', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/reset_session_page.js'
          );
          expect(status).toBe(200);
        });
      });
    });

    describe('available features', () => {
      it('all Dashboard and Discover sub-feature privileges are disabled', async () => {
        const { body } = await supertestAdminWithCookieCredentials.get('/api/features').expect(200);

        // We should make sure that neither Discover nor Dashboard displays any sub-feature privileges in Serverless.
        // If any of these features adds a new sub-feature privilege we should make an explicit decision whether it
        // should be displayed in Serverless.
        const features = body as KibanaFeatureConfig[];
        for (const featureId of ['discover', 'dashboard']) {
          const feature = features.find((f) => f.id === featureId)!;
          const subFeaturesPrivileges = collectSubFeaturesPrivileges(feature);
          for (const privilege of subFeaturesPrivileges.values()) {
            log.debug(
              `Verifying that ${privilege.id} sub-feature privilege of ${featureId} feature is disabled.`
            );
            expect(privilege.disabled).toBe(true);
          }
        }
      });
    });
  });
}
