/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  syntheticsApiKeyID,
  syntheticsApiKeyObjectType,
} from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/service_api_key';
import { serviceApiKeyPrivileges } from '@kbn/synthetics-plugin/server/synthetics_service/get_api_key';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('SyntheticsEnablement', () => {
    const supertestWithAuth = getService('supertest');
    const supertest = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    const esSupertest = getService('esSupertest');

    const getApiKeys = async () => {
      const { body } = await esSupertest.get(`/_security/api_key`);
      const apiKeys = body.api_keys || [];
      return apiKeys.filter(
        (apiKey: any) => apiKey.name.includes('synthetics-api-key') && apiKey.invalidated === false
      );
    };

    describe('[PUT] - /internal/uptime/service/enablement', () => {
      beforeEach(async () => {
        const apiKeys = await getApiKeys();
        if (apiKeys.length) {
          await supertestWithAuth.delete(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true');
        }
      });
      ['manage_security', 'manage_own_api_key', 'manage_api_key'].forEach((privilege) => {
        it(`returns response for an admin with privilege ${privilege}`, async () => {
          const username = 'admin';
          const roleName = `synthetics_admin-${privilege}`;
          const password = `${username}-password`;
          try {
            await security.role.create(roleName, {
              kibana: [
                {
                  feature: {
                    uptime: ['all'],
                  },
                  spaces: ['*'],
                },
              ],
              elasticsearch: {
                cluster: [privilege, ...serviceApiKeyPrivileges.cluster],
                indices: serviceApiKeyPrivileges.indices,
              },
            });

            await security.user.create(username, {
              password,
              roles: [roleName],
              full_name: 'a kibana user',
            });

            const apiResponse = await supertest
              .put(API_URLS.SYNTHETICS_ENABLEMENT)
              .auth(username, password)
              .set('kbn-xsrf', 'true')
              .expect(200);

            expect(apiResponse.body).eql({
              areApiKeysEnabled: true,
              canManageApiKeys: true,
              canEnable: true,
              isEnabled: true,
              isValidApiKey: true,
            });
          } finally {
            await security.user.delete(username);
            await security.role.delete(roleName);
          }
        });
      });

      it(`does not create excess api keys`, async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.indices,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          const validApiKeys = await getApiKeys();
          expect(validApiKeys.length).eql(1);

          // call api a second time
          const apiResponse2 = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse2.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          const validApiKeys2 = await getApiKeys();
          expect(validApiKeys2.length).eql(1);
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it(`auto re-enables the api key when created with invalid permissions and invalidates old api key`, async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        try {
          // create api key with incorrect permissions
          const apiKeyResult = await esSupertest
            .post(`/_security/api_key`)
            .send({
              name: 'my-api-key',
              expiration: '1d',
              role_descriptors: {
                'role-a': {
                  cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
                  indices: [
                    {
                      names: ['synthetics-*'],
                      privileges: ['view_index_metadata', 'create_doc', 'auto_configure'],
                    },
                  ],
                },
              },
            })
            .expect(200);
          kibanaServer.savedObjects.create({
            id: syntheticsApiKeyID,
            type: syntheticsApiKeyObjectType,
            overwrite: true,
            attributes: {
              id: apiKeyResult.body.id,
              name: 'synthetics-api-key (required for monitor management)',
              apiKey: apiKeyResult.body.api_key,
            },
          });

          const { body: allApiKeys } = await esSupertest.get(`/_security/api_key`);
          expect(
            allApiKeys.api_keys.find((apiKey: any) => apiKey.id === apiKeyResult.body.id)
              .invalidated
          ).eql(false);

          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.indices,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          const { body: allApiKeys2 } = await esSupertest.get(`/_security/api_key`);
          expect(
            allApiKeys2.api_keys.find((apiKey: any) => apiKey.id === apiKeyResult.body.id)
              .invalidated
          ).eql(true);

          const validApiKeys = await getApiKeys();
          expect(validApiKeys.length).eql(1);
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it(`auto re-enables api key when invalidated`, async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.indices,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          const validApiKeys = await getApiKeys();
          expect(validApiKeys.length).eql(1);

          // delete api key
          await esSupertest
            .delete(`/_security/api_key`)
            .send({
              ids: [validApiKeys[0].id],
            })
            .expect(200);

          const validApiKeysAferDeletion = await getApiKeys();
          expect(validApiKeysAferDeletion.length).eql(0);

          // call api a second time
          const apiResponse2 = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse2.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          const validApiKeys2 = await getApiKeys();
          expect(validApiKeys2.length).eql(1);
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it('returns response for an uptime all user without admin privileges', async () => {
        const username = 'uptime';
        const roleName = 'uptime_user';
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {},
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: false,
            canEnable: false,
            isEnabled: false,
            isValidApiKey: false,
          });
        } finally {
          await security.role.delete(roleName);
          await security.user.delete(username);
        }
      });
    });

    describe('[DELETE] - /internal/uptime/service/enablement', () => {
      beforeEach(async () => {
        const apiKeys = await getApiKeys();
        if (apiKeys.length) {
          await supertestWithAuth.delete(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true');
        }
      });
      it('with an admin', async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.indices,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          await supertest
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          const delResponse = await supertest
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          expect(delResponse.body).eql({});
          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it('with an uptime user', async () => {
        const username = 'uptime';
        const roleName = `uptime_user`;
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {},
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          await supertestWithAuth
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await supertest
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(403);
          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: false,
            canEnable: false,
            isEnabled: true,
            isValidApiKey: true,
          });
        } finally {
          await supertestWithAuth
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await security.user.delete(username);
          await security.role.delete(roleName);
        }
      });

      it('is space agnostic', async () => {
        const username = 'admin';
        const roleName = `synthetics_admin`;
        const password = `${username}-password`;
        const SPACE_ID = 'test-space';
        const SPACE_NAME = 'test-space-name';
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
        try {
          await security.role.create(roleName, {
            kibana: [
              {
                feature: {
                  uptime: ['all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: {
              cluster: ['manage_security', ...serviceApiKeyPrivileges.cluster],
              indices: serviceApiKeyPrivileges.indices,
            },
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          // can enable synthetics in default space when enabled in a non default space
          const apiResponseGet = await supertest
            .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_ENABLEMENT}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponseGet.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          await supertest
            .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_ENABLEMENT}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await supertest
            .delete(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          const apiResponse = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });

          // can disable synthetics in non default space when enabled in default space
          await supertest
            .post(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          await supertest
            .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_ENABLEMENT}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);
          const apiResponse2 = await supertest
            .put(API_URLS.SYNTHETICS_ENABLEMENT)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(apiResponse2.body).eql({
            areApiKeysEnabled: true,
            canManageApiKeys: true,
            canEnable: true,
            isEnabled: true,
            isValidApiKey: true,
          });
        } finally {
          await security.user.delete(username);
          await security.role.delete(roleName);
          await kibanaServer.spaces.delete(SPACE_ID);
        }
      });
    });
  });
}
