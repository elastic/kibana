/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { configArray } from '../constants';
import { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('default index pattern api', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    configArray.forEach((config) => {
      describe(config.name, () => {
        const newId = () => `default-id-${Date.now()}-${Math.random()}`;
        it('can set default index pattern', async () => {
          const defaultId = newId();
          const defaultPath = `${config.basePath}/default`;
          const serviceKeyId = `${config.serviceKey}_id`;
          const response1 = await supertestWithoutAuth
            .post(defaultPath)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [serviceKeyId]: defaultId,
              force: true,
            });
          expect(response1.status).to.be(200);
          expect(response1.body.acknowledged).to.be(true);

          const response2 = await supertestWithoutAuth
            .get(defaultPath)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(response2.status).to.be(200);
          expect(response2.body[serviceKeyId]).to.be(defaultId);

          const response3 = await supertestWithoutAuth
            .post(defaultPath)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [serviceKeyId]: newId(),
              // no force this time, so this new default shouldn't be set
            });

          expect(response3.status).to.be(200);
          const response4 = await supertestWithoutAuth
            .get(defaultPath)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          expect(response4.body[serviceKeyId]).to.be(defaultId); // original default id is used

          const response5 = await supertestWithoutAuth
            .post(defaultPath)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [serviceKeyId]: null,
              force: true,
            });
          expect(response5.status).to.be(200);

          const response6 = await supertestWithoutAuth
            .get(defaultPath)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
          // TODO: The response comes back undefined in Serverless
          const body = response6.body[serviceKeyId];
          const expected = body === undefined ? null : body;
          expect(expected).to.be('');
        });
      });
    });
  });
}
