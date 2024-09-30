/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let credentials: { Cookie: string };

  describe('search_indices Status APIs', function () {
    describe('indices status', function () {
      before(async () => {
        // get auth header for Viewer role
        credentials = await svlUserManager.getM2MApiCredentialsWithRoleScope('developer');
      });
      it('returns list of index names', async () => {
        const { body } = await supertestWithoutAuth
          .get('/internal/search_indices/status')
          .set(svlCommonApi.getInternalRequestHeader())
          .set(credentials)
          .expect(200);

        expect(body.indexNames).toBeDefined();
        expect(Array.isArray(body.indexNames)).toBe(true);
      });
    });
    describe('user privileges', function () {
      // GET /internal/search_indices/start_privileges
      describe('developer', function () {
        before(async () => {
          // get auth header for Viewer role
          credentials = await svlUserManager.getM2MApiCredentialsWithRoleScope('developer');
        });

        it('returns expected privileges', async () => {
          const { body } = await supertestWithoutAuth
            .get('/internal/search_indices/start_privileges')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(credentials)
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
          // get auth header for Viewer role
          credentials = await svlUserManager.getM2MApiCredentialsWithRoleScope('viewer');
        });

        it('returns expected privileges', async () => {
          const { body } = await supertestWithoutAuth
            .get('/internal/search_indices/start_privileges')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(credentials)
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
