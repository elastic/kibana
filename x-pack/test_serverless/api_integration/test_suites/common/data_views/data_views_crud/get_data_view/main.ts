/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';
import { RoleCredentials, InternalRequestHeader } from '../../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('main', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('can retrieve an index_pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
              },
            });
          const response2 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response2.body[config.serviceKey].title).to.be(title);
        });
      });
    });
  });
}
