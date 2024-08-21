/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { EXISTING_INDICES_PATH } from '@kbn/data-views-plugin/common/constants';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('_existing_indices response', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });
    after(async () => {
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns an array of existing indices', async () => {
      await supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          indices: ['basic_index', 'bad_index'],
        })
        .expect(200, ['basic_index']);
    });

    it('returns an empty array when no indices exist', async () => {
      await supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          indices: ['bad_index'],
        })
        .expect(200, []);
    });
  });
}
