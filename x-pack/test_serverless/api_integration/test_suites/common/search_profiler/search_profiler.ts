/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/searchprofiler';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  const supertestWithoutAuth = getService('supertestWithoutAuth') as any;

  describe('Profile', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should return profile results for a valid index', async () => {
      const payload = {
        index: '_all',
        query: {
          query: {
            match_all: {},
          },
        },
      };

      const { body } = await supertestWithoutAuth
        .post(`${API_BASE_PATH}/profile`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set('Content-Type', 'application/json;charset=UTF-8')
        .set(roleAuthc.apiKeyHeader)
        .send(payload)
        .expect(200);

      expect(body.ok).to.eql(true);
    });

    it('should return error for invalid index', async () => {
      const payloadWithInvalidIndex = {
        index: 'index_does_not_exist',
        query: {
          query: {
            match_all: {},
          },
        },
      };

      const { body } = await supertestWithoutAuth
        .post(`${API_BASE_PATH}/profile`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set('Content-Type', 'application/json;charset=UTF-8')
        .set(roleAuthc.apiKeyHeader)
        .send(payloadWithInvalidIndex)
        .expect(404);

      expect(body.error).to.eql('Not Found');
    });
  });
}
