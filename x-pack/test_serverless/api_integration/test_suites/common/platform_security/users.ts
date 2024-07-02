/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('security/users', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    describe('route access', () => {
      // ToDo: uncomment when we disable user APIs
      describe.skip('disabled', () => {
        it('get', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/users/elastic')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get all', async () => {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/users')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('create/update', async () => {
          const { body, status } = await supertestWithoutAuth
            .post(`/internal/security/users/some_testuser`)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({ username: 'some_testuser', password: 'testpassword', roles: [] });
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('delete', async () => {
          const { body, status } = await supertestWithoutAuth
            .delete(`/internal/security/users/elastic`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('disable', async () => {
          const { body, status } = await supertestWithoutAuth
            .post(`/internal/security/users/elastic/_disable`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('enable', async () => {
          const { body, status } = await supertestWithoutAuth
            .post(`/internal/security/users/elastic/_enable`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('set password', async () => {
          const { body, status } = await supertestWithoutAuth
            .post(`/internal/security/users/{username}/password`)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              password: 'old_pw',
              newPassword: 'new_pw',
            });
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      // ToDo: remove when we disable user APIs
      describe('internal', () => {
        it('get', async () => {
          const { status } = await supertestWithoutAuth
            .get('/internal/security/users/elastic')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).not.toBe(404);
        });

        it('get all', async () => {
          const { status } = await supertestWithoutAuth
            .get('/internal/security/users')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).not.toBe(404);
        });

        it('create/update', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/users/some_testuser`)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({ username: 'some_testuser', password: 'testpassword', roles: [] });
          expect(status).not.toBe(404);
        });

        it('delete', async () => {
          const { status } = await supertestWithoutAuth
            .delete(`/internal/security/users/elastic`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).not.toBe(404);
        });

        it('disable', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/users/elastic/_disable`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).not.toBe(404);
        });

        it('enable', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/users/elastic/_enable`)
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader);
          expect(status).not.toBe(404);
        });

        it('set password', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/users/{username}/password`)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              password: 'old_pw',
              newPassword: 'new_pw',
            });
          expect(status).not.toBe(404);
        });
      });
    });
  });
}
