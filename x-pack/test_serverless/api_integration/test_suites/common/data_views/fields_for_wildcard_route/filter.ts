/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { FIELDS_FOR_WILDCARD_PATH } from '@kbn/data-views-plugin/common/constants';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('filter fields', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await es.index({
        index: 'helloworld1',
        refresh: true,
        id: 'helloworld',
        body: { hello: 'world' },
      });

      await es.index({
        index: 'helloworld2',
        refresh: true,
        id: 'helloworld2',
        body: { bye: 'world' },
      });
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    it('can filter', async () => {
      const a = await supertestWithoutAuth
        .put(FIELDS_FOR_WILDCARD_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({ pattern: 'helloworld*' })
        .send({ index_filter: { exists: { field: 'bye' } } });

      const fieldNames = a.body.fields.map((fld: { name: string }) => fld.name);

      expect(fieldNames.indexOf('bye') > -1).to.be(true);
      expect(fieldNames.indexOf('hello') === -1).to.be(true);
    });
  });
}
