/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RoleCredentials, InternalRequestHeader } from '../../../../../../shared/services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('errors', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertestWithoutAuth
            .post(`${config.path}/${id}/fields`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              fields: {
                foo: {},
              },
            });

          expect(response.status).to.be(404);
        });

        it('returns error when "fields" payload attribute is invalid', async () => {
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
            .post(`${config.path}/${response1.body[config.serviceKey].id}/fields`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              fields: 123,
            });

          expect(response2.status).to.be(400);
          expect(response2.body.statusCode).to.be(400);
          expect(response2.body.message).to.be(
            '[request body.fields]: expected value of type [object] but got [number]'
          );
        });

        it('returns error if not changes are specified', async () => {
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
            .post(`${config.path}/${response1.body[config.serviceKey].id}/fields`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              fields: {
                foo: {},
                bar: {},
                baz: {},
              },
            });

          expect(response2.status).to.be(400);
          expect(response2.body.statusCode).to.be(400);
          expect(response2.body.message).to.be('Change set is empty.');
        });
      });
    });
  });
}
