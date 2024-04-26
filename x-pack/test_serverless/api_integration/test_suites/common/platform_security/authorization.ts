/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
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
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('security/authorization', function () {
    describe('route access', () => {
      describe('internal', () => {
        describe('disabled', () => {
          it('get all privileges', async () => {
            const { body, status } = await supertest
              .get('/api/security/privileges')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get built-in elasticsearch privileges', async () => {
            const { body, status } = await supertest
              .get('/internal/security/esPrivileges/builtin')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('create/update role', async () => {
            const { body, status } = await supertest
              .put('/api/security/role/test')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get role', async () => {
            const { body, status } = await supertest
              .get('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get all roles', async () => {
            const { body, status } = await supertest
              .get('/api/security/role')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('delete role', async () => {
            const { body, status } = await supertest
              .delete('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });

          it('get shared saved object permissions', async () => {
            const { body, status } = await supertest
              .get('/internal/security/_share_saved_object_permissions')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertApiNotFound(body, status);
          });
        });
      });

      describe('public', () => {
        it('reset session page', async () => {
          const { status } = await supertest
            .get('/internal/security/reset_session_page.js')
            .set(svlCommonApi.getCommonRequestHeader());
          expect(status).toBe(200);
        });
      });
    });

    describe('available features', () => {
      const svlUserManager = getService('svlUserManager');
      const supertestWithoutAuth = getService('supertestWithoutAuth');
      let adminCredentials: { Cookie: string };

      before(async () => {
        // get auth header for Viewer role
        adminCredentials = await svlUserManager.getApiCredentialsForRole('admin');
      });

      it('all Dashboard and Discover sub-feature privileges are disabled', async () => {
        const { body } = await supertestWithoutAuth
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
