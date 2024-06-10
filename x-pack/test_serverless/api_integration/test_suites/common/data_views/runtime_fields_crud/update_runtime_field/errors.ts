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

  describe('errors', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertestWithoutAuth
            .post(`${config.path}/${id}/runtime_field/foo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              runtimeField: {
                type: 'keyword',
                script: {
                  source: "doc['something_new'].value",
                },
              },
            });

          expect(response.status).to.be(404);
        });

        it('returns error when field name is specified', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertestWithoutAuth
            .post(`${config.path}/${id}/runtime_field/foo`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'foo',
              runtimeField: {
                type: 'keyword',
                script: {
                  source: "doc['something_new'].value",
                },
              },
            });

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            "[request body.name]: a value wasn't expected to be present"
          );
        });
      });
    });
  });
}
