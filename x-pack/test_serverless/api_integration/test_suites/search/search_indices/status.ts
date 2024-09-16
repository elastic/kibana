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
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestDeveloperWithCookieCredentials: SupertestWithRoleScopeType;
  let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

  describe('search_indices Status APIs', function () {
    describe('indices status', function () {
      before(async () => {
        supertestDeveloperWithCookieCredentials =
          await roleScopedSupertest.getSupertestWithRoleScope('developer', {
            useCookieHeader: true,
            withInternalHeaders: true,
          });
      });
      it('returns list of index names', async () => {
        const { body } = await supertestDeveloperWithCookieCredentials
          .get('/internal/search_indices/status')
          .expect(200);

        expect(body.indexNames).toBeDefined();
        expect(Array.isArray(body.indexNames)).toBe(true);
      });
    });
    describe('user privileges', function () {
      // GET /internal/search_indices/start_privileges
      describe('developer', function () {
        it('returns expected privileges', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .get('/internal/search_indices/start_privileges')
            .expect(200);

          expect(body).toEqual({
            privileges: {
              canCreateApiKeys: true,
              canCreateIndex: true,
            },
          });
        });
      });
      describe('viewer', function () {
        before(async () => {
          supertestViewerWithCookieCredentials =
            await roleScopedSupertest.getSupertestWithRoleScope('viwer', {
              useCookieHeader: true,
              withInternalHeaders: true,
            });
        });

        it('returns expected privileges', async () => {
          const { body } = await supertestViewerWithCookieCredentials
            .get('/internal/search_indices/start_privileges')
            .expect(200);

          expect(body).toEqual({
            privileges: {
              canCreateApiKeys: false,
              canCreateIndex: false,
            },
          });
        });
      });
    });
  });
}
