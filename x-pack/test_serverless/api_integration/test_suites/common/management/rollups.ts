/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common/src/constants';
import { FIELDS_FOR_WILDCARD_PATH as BASE_URI } from '@kbn/data-views-plugin/common/constants';
import { DataViewType } from '@kbn/data-views-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('rollup data views - fields for wildcard', function () {
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
    it('returns 200 and best effort response despite lack of rollup support', async () => {
      const response = await supertestWithoutAuth
        .get(BASE_URI)
        .query({
          pattern: 'basic_index',
          type: DataViewType.ROLLUP,
          rollup_index: 'bar',
        })
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'true')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

      expect(response.status).toBe(200);
      expect(response.body.fields.length).toEqual(5);
    });
  });
}
