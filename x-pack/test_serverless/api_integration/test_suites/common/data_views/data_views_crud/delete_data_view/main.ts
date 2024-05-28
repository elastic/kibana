/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('main', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('deletes an index_pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
              },
            });

          const response2 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response2.status).to.be(200);

          const response3 = await supertestWithoutAuth
            .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.status).to.be(200);

          const response4 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response4.status).to.be(404);
        });
      });

      it('returns nothing', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertestWithoutAuth

          .post(config.path)
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            [config.serviceKey]: {
              title,
            },
          });

        await supertestWithoutAuth
          .get(`${config.path}/${response1.body[config.serviceKey].id}`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        const response2 = await supertestWithoutAuth
          .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);

        // verify empty response
        expect(Object.keys(response2.body).length).to.be(0);
      });
    });
  });
}
