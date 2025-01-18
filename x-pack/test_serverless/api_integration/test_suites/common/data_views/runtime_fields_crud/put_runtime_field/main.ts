/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('main', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    configArray.forEach((config) => {
      describe(config.name, () => {
        it('can overwrite an existing field', async () => {
          const title = `basic_index`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
                runtimeFieldMap: {
                  runtimeFoo: {
                    type: 'keyword',
                    script: {
                      source: "doc['field_name'].value",
                    },
                  },
                  runtimeBar: {
                    type: 'keyword',
                    script: {
                      source: "doc['field_name'].value",
                    },
                  },
                },
              },
            });

          const response2 = await supertestWithoutAuth
            .put(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeFoo',
              runtimeField: {
                type: 'long',
                script: {
                  source: "doc['field_name'].value",
                },
              },
            });

          expect(response2.status).to.be(200);
          expect(response2.body[config.serviceKey]).to.not.be.empty();

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field/runtimeFoo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          const field3 =
            config.serviceKey === 'index_pattern' ? response3.body.field : response3.body.fields[0];

          expect(response3.status).to.be(200);
          expect(field3.type).to.be('number');

          const response4 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field/runtimeBar`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          const field4 =
            config.serviceKey === 'index_pattern' ? response4.body.field : response4.body.fields[0];

          expect(response4.status).to.be(200);
          expect(field4.type).to.be('string');
        });

        it('can add a new runtime field', async () => {
          const title = `basic_index`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
                runtimeFieldMap: {
                  runtimeFoo: {
                    type: 'keyword',
                    script: {
                      source: "doc['field_name'].value",
                    },
                  },
                },
              },
            });

          await supertestWithoutAuth
            .put(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "doc['field_name'].value",
                },
              },
            });

          const response2 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field/runtimeBar`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          const field =
            config.serviceKey === 'index_pattern' ? response2.body.field : response2.body.fields[0];

          expect(response2.status).to.be(200);
          expect(response2.body[config.serviceKey]).to.not.be.empty();
          expect(typeof field.runtimeField).to.be('object');
        });
      });
    });
  });
}
