/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

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
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('security/authorization', function () {
    // see details: https://github.com/elastic/kibana/issues/192282
    this.tags(['failsOnMKI']);
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('route access', () => {
      describe('internal', () => {
        describe('disabled', () => {
          // Skipped due to change in QA environment for role management and spaces
          // TODO: revisit once the change is rolled out to all environments
          it.skip('get all privileges', async () => {
            const { body, status } = await supertestWithoutAuth
              .get('/api/security/privileges')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });

          // Skipped due to change in QA environment for role management and spaces
          // TODO: revisit once the change is rolled out to all environments
          it.skip('get built-in elasticsearch privileges', async () => {
            const { body, status } = await supertestWithoutAuth
              .get('/internal/security/esPrivileges/builtin')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('create/update roleAuthc', async () => {
            const { body, status } = await supertestWithoutAuth
              .put('/api/security/role/test')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get roleAuthc', async () => {
            const { body, status } = await supertestWithoutAuth
              .get('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get all roles', async () => {
            const { body, status } = await supertestWithoutAuth
              .get('/api/security/role')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('delete roleAuthc', async () => {
            const { body, status } = await supertestWithoutAuth
              .delete('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get shared saved object permissions', async () => {
            const { body, status } = await supertestWithoutAuth
              .get('/internal/security/_share_saved_object_permissions')
              .set(svlCommonApi.getInternalRequestHeader())
              .set(roleAuthc.apiKeyHeader);
            svlCommonApi.assertApiNotFound(body, status);
          });
        });
      });

      describe('public', () => {
        it('reset session page', async () => {
          const { status } = await supertestWithoutAuth
            .get('/internal/security/reset_session_page.js')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });
      });
    });

    describe('available features', () => {
      let adminCredentials: { Cookie: string };

      before(async () => {
        // get auth header for Viewer roleAuthc
        adminCredentials = await svlUserManager.getM2MApiCredentialsWithRoleScope('admin');
      });

      it('all Dashboard and Discover sub-feature privileges are disabled', async () => {
        const { body } = await supertest
          .get('/api/features')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(adminCredentials)
          .expect(200);

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
