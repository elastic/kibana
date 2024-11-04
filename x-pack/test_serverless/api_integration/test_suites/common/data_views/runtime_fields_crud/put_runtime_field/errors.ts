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
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('errors', () => {
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
        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertestWithoutAuth
            .put(`${config.path}/${id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response.status).to.be(404);
        });

        it('returns error on non-runtime field update attempt', async () => {
          const title = `basic_index`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
              },
            });

          const response2 = await supertestWithoutAuth
            .put(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'bar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response2.status).to.be(400);
          expect(response2.body.message).to.be('Only runtime fields can be updated');
        });
      });
    });
  });
}
