/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('security/views', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('route access', () => {
      describe('disabled', () => {
        // ToDo: unskip these when we disable login routes
        xit('login', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/login')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        // ToDo: unskip these when we disable login routes
        xit('get login state', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/login_state')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('access agreement', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/security/access_agreement')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get access agreement state', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/access_agreement/state')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('public', () => {
        it('login', async () => {
          const { status } = await supertestWithoutAuth
            .get('/login')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(302);
        });

        it('get login state', async () => {
          const { status } = await supertestWithoutAuth
            .get('/internal/security/login_state')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });

        it('capture URL', async () => {
          const { status } = await supertestWithoutAuth
            .get('/internal/security/capture-url')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });

        it('space selector', async () => {
          const { status } = await supertestWithoutAuth
            .get('/spaces/space_selector')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });

        it('enter space', async () => {
          const { status } = await supertestWithoutAuth
            .get('/spaces/enter')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(302);
        });

        it('account', async () => {
          const { status } = await supertestWithoutAuth
            .get('/security/account')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });

        it('logged out', async () => {
          const { status } = await supertestWithoutAuth
            .get('/security/logged_out')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });

        it('logout', async () => {
          const { status } = await supertestWithoutAuth
            .get('/logout')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });

        it('overwritten session', async () => {
          const { status } = await supertestWithoutAuth
            .get('/security/overwritten_session')
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(status).toBe(200);
        });
      });
    });
  });
}
