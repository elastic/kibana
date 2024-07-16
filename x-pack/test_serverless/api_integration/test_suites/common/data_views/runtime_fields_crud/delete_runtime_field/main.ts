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
        it('can delete a runtime field', async () => {
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
                  runtimeBar: {
                    type: 'long',
                    script: {
                      source: "emit(doc['field_name'].value)",
                    },
                  },
                },
              },
            });

          const response2 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(typeof response2.body[config.serviceKey].fields.runtimeBar).to.be('object');

          const response3 = await supertestWithoutAuth
            .delete(
              `${config.path}/${response1.body[config.serviceKey].id}/runtime_field/runtimeBar`
            )
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.status).to.be(200);

          const response4 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(typeof response4.body[config.serviceKey].fields.runtimeBar).to.be('undefined');
          await supertestWithoutAuth
            .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
        });
      });
    });
  });
}
