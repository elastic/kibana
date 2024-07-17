/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { kibanaTestSuperuserServerless } from '@kbn/test';
import { SecurityApiKey } from '@elastic/elasticsearch/lib/api/types';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/internal/serverless_search';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const es = getService('es');
  const log = getService('log');
  let roleAuthc: RoleCredentials;

  describe('API Key routes', function () {
    describe('GET api_keys', function () {
      before(async () => {
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('developer');
      });
      after(async () => {
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });
      it('return apiKeys', async () => {
        const { body } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/api_keys`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(body).toBeDefined();
        expect(body.apiKeys).toBeDefined();
        expect(Array.isArray(body.apiKeys)).toBe(true);
      });
    });

    describe('POST api_key', function () {
      const deleteAllApiKeys = async () => {
        let apiKeys: SecurityApiKey[];
        // Delete existing API keys
        try {
          const apiKeysResult = await es.security.getApiKey({
            username: kibanaTestSuperuserServerless.username,
          });
          apiKeys = apiKeysResult.api_keys;
        } catch (err) {
          log.debug('[Setup error] error listing API keys');
          throw err;
        }

        expect(Array.isArray(apiKeys)).toBe(true);
        if (apiKeys.length === 0) {
          return;
        }

        const apiKeysToDelete = apiKeys.map(({ id }) => id);
        await es.security.invalidateApiKey({ ids: apiKeysToDelete });
      };
      before(async () => {
        await deleteAllApiKeys();
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('developer');
      });
      after(async () => {
        await deleteAllApiKeys();
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });
      it('can create a key that expires', async () => {
        const createBody = {
          name: 'test-api-key-001',
          expiration: '60d',
        };
        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/api_key`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.cookieHeader)
          .send(createBody)
          .expect(200);

        expect(body).toMatchObject({ name: 'test-api-key-001', expiration: expect.anything() });
      });
      it('can create a key that never expires', async () => {
        const createBody = {
          name: 'test-api-key-002',
        };
        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/api_key`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.cookieHeader)
          .send(createBody)
          .expect(200);

        expect(body).toMatchObject({ name: 'test-api-key-002' });
      });
      it('has beats_logstash_format in result', async () => {
        const createBody = {
          name: 'test-api-key-003',
        };
        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/api_key`)
          .set(svlCommonApi.getInternalRequestHeader())
          .send(createBody)
          .set(roleAuthc.cookieHeader)
          .expect(200);

        expect(body).toMatchObject({
          name: 'test-api-key-003',
          beats_logstash_format: expect.stringContaining(':'),
        });
      });
    });
  });
}
