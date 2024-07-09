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
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    configArray.forEach((config) => {
      describe(config.name, () => {
        it('can fetch a runtime field', async () => {
          const title = `basic_index*`;
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
                      source: "emit(doc['field_name'].value)",
                    },
                  },
                  runtimeBar: {
                    type: 'keyword',
                    script: {
                      source: "emit(doc['field_name'].value)",
                    },
                  },
                },
              },
            });

          expect(response1.status).to.be(200);

          const response2 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field/runtimeFoo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          const field =
            config.serviceKey === 'index_pattern' ? response2.body.field : response2.body.fields[0];

          expect(response2.status).to.be(200);
          expect(response2.body[config.serviceKey]).to.not.be.empty();
          expect(typeof field).to.be('object');
          expect(field.name).to.be('runtimeFoo');
          expect(field.type).to.be('string');
          expect(field.scripted).to.be(false);
          expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
          await supertestWithoutAuth
            .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
        });
      });
    });
  });
}
