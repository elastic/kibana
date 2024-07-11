/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  let roleMapping: { id: string; name: string; api_key: string; encoded: string };
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  describe('security/api_keys', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    describe('route access', () => {
      describe('internal', () => {
        before(async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/internal/security/api_key')
            .set(roleAuthc.cookieHeader)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              name: 'test',
              metadata: {},
              role_descriptors: {},
            });
          expect(status).toBe(200);
          roleMapping = body;
        });

        after(async function invalidateAll() {
          const { body, status } = await supertestWithoutAuth
            .get('/internal/security/api_key?isAdmin=true')
            .set(roleAuthc.cookieHeader)
            .set(svlCommonApi.getInternalRequestHeader());

          if (status === 200) {
            await supertestWithoutAuth
              .post('/internal/security/api_key/invalidate')
              .set(roleAuthc.cookieHeader)
              .set(svlCommonApi.getInternalRequestHeader())
              .send({
                apiKeys: body?.apiKeys,
                isAdmin: true,
              });
          }
        });

        it('create', async () => {
          let body: unknown;
          let status: number;
          const requestBody = {
            name: 'create_test',
            metadata: {},
            role_descriptors: {},
          };

          ({ body, status } = await supertestWithoutAuth
            .post('/internal/security/api_key')
            .set(svlCommonApi.getCommonRequestHeader())
            .send(requestBody));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 401,
            error: 'Unauthorized',
            message: expect.stringContaining('Unauthorized'),
          });
          expect(status).toBe(401);

          ({ body, status } = await supertestWithoutAuth
            .post('/internal/security/api_key')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.cookieHeader)
            .send(requestBody));
          // expect success because we're using the internal header
          expect(body).toEqual(expect.objectContaining({ name: 'create_test' }));
          expect(status).toBe(200);
        });

        it('update', async () => {
          let body: unknown;
          let status: number;
          const requestBody = {
            id: roleMapping.id,
            metadata: { test: 'value' },
            role_descriptors: {},
          };

          ({ body, status } = await supertestWithoutAuth
            .put('/internal/security/api_key')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(roleAuthc.cookieHeader)
            .send(requestBody));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [put] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .put('/internal/security/api_key')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.cookieHeader)
            .send(requestBody));
          // expect success because we're using the internal header
          expect(body).toEqual(expect.objectContaining({ updated: true }));
          expect(status).toBe(200);
        });

        it('get enabled', async () => {
          let body: unknown;
          let status: number;

          ({ body, status } = await supertest
            .get('/internal/security/api_key/_enabled')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(roleAuthc.cookieHeader));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .get('/internal/security/api_key/_enabled')
            .set(roleAuthc.cookieHeader)
            .set(svlCommonApi.getInternalRequestHeader()));
          // expect success because we're using the internal header
          expect(body).toEqual({ apiKeysEnabled: true });
          expect(status).toBe(200);
        });

        it('invalidate', async () => {
          let body: unknown;
          let status: number;
          const requestBody = {
            apiKeys: [
              {
                id: roleMapping.id,
                name: roleMapping.name,
              },
            ],
            isAdmin: true,
          };

          ({ body, status } = await supertestWithoutAuth
            .post('/internal/security/api_key/invalidate')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(roleAuthc.cookieHeader)
            .send(requestBody));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .post('/internal/security/api_key/invalidate')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.cookieHeader)
            .send(requestBody));
          // expect success because we're using the internal header
          expect(body).toEqual({
            errors: [],
            itemsInvalidated: [
              {
                id: roleMapping.id,
                name: roleMapping.name,
              },
            ],
          });
          expect(status).toBe(200);
        });

        it('query', async () => {
          const requestBody = {
            query: {
              bool: { must: [{ match: { invalidated: { query: false, operator: 'and' } } }] },
            },
            sort: { field: 'creation', direction: 'desc' },
            from: 0,
            size: 1,
          };

          const { body } = await supertestWithoutAuth
            .post('/internal/security/api_key/_query')
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.cookieHeader)
            .send(requestBody)
            .expect(200);

          expect(body.apiKeys.length).toEqual(1);
        });
      });
    });
  });
}
