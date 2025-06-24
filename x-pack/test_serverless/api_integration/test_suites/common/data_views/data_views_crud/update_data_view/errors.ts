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
        it('returns error when index_pattern object is not provided', async () => {
          const response = await supertestWithoutAuth
            .post(`${config.path}/foo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            '[request body]: expected a plain object value, but found [null] instead.'
          );
        });

        it('returns error on non-existing index_pattern', async () => {
          const response = await supertestWithoutAuth
            .post(`${config.path}/non-existing-index-pattern`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {},
            });

          expect(response.status).to.be(404);
          expect(response.body.statusCode).to.be(404);
          expect(response.body.message).to.be(
            'Saved object [index-pattern/non-existing-index-pattern] not found'
          );
        });

        it('returns error when "refresh_fields" parameter is not a boolean', async () => {
          const response = await supertestWithoutAuth
            .post(`${config.path}/foo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              refresh_fields: 123,
              [config.serviceKey]: {
                title: 'foo',
              },
            });

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
          );
        });

        it('returns success when update patch is empty', async () => {
          const title1 = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title: title1,
              },
            });
          const id = response.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {},
            });

          expect(response2.status).to.be(200);
        });
      });
    });
  });
}
