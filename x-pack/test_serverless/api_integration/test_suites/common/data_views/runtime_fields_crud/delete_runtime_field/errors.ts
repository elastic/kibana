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

  describe('errors', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    const basicIndex = 'b*sic_index';
    let indexPattern: any;

    configArray.forEach((config) => {
      describe(config.name, () => {
        before(async () => {
          await esArchiver.load(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );

          indexPattern = (
            await supertestWithoutAuth
              .post(config.path)
              .set(internalReqHeader)
              .set(roleAuthc.apiKeyHeader)
              .send({
                [config.serviceKey]: {
                  title: basicIndex,
                },
              })
          ).body[config.serviceKey];
        });

        after(async () => {
          await esArchiver.unload(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );

          if (indexPattern) {
            await supertestWithoutAuth
              .delete(`${config.path}/${indexPattern.id}`)
              .set(internalReqHeader)
              .set(roleAuthc.apiKeyHeader);
          }
        });

        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertestWithoutAuth
            .delete(`${config.path}/${id}/runtime_field/foo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response.status).to.be(404);
        });

        it('returns 404 error on non-existing runtime field', async () => {
          const response1 = await supertestWithoutAuth
            .delete(`${config.path}/${indexPattern.id}/runtime_field/test`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response1.status).to.be(404);
        });

        it('returns error when ID is too long', async () => {
          const id = `xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx`;
          const response = await supertestWithoutAuth
            .delete(`${config.path}/${id}/runtime_field/foo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response.status).to.be(400);
          expect(response.body.message).to.be(
            '[request params.id]: value has length [1759] but it must have a maximum length of [1000].'
          );
        });
      });
    });
  });
}
