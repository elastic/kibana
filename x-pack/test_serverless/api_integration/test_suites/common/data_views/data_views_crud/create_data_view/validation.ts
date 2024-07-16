/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';
import { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('validation', () => {
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
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            '[request body]: expected a plain object value, but found [null] instead.'
          );
        });

        it('returns error on empty index_pattern object', async () => {
          const response = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {},
            });

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            `[request body.${config.serviceKey}.title]: expected value of type [string] but got [undefined]`
          );
        });

        it('returns error when "override" parameter is not a boolean', async () => {
          const response = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: 123,
              [config.serviceKey]: {
                title: 'foo',
              },
            });

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            '[request body.override]: expected value of type [boolean] but got [number]'
          );
        });

        it('returns error when "refresh_fields" parameter is not a boolean', async () => {
          const response = await supertestWithoutAuth
            .post(config.path)
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

        it('returns an error when unknown runtime field type', async () => {
          const title = `basic_index*`;
          const response = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
                runtimeFieldMap: {
                  runtimeFoo: {
                    type: 'wrong-type',
                    script: {
                      source: 'emit(doc["foo"].value)',
                    },
                  },
                },
              },
            });

          expect(response.status).to.be(400);
        });
      });
    });
  });
}
