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
  const randomness = getService('randomness');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('_existing_indices params', () => {
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

    it('requires a query param', () =>
      supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({})
        .expect(400));

    it('accepts indices param as single index string', () =>
      supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          indices: 'filebeat-*',
        })
        .expect(200));

    it('accepts indices param as single index array', () =>
      supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          indices: ['filebeat-*'],
        })
        .expect(200));

    it('accepts indices param', () =>
      supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          indices: ['filebeat-*', 'packetbeat-*'],
        })
        .expect(200));

    it('rejects unexpected query params', () =>
      supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          [randomness.word()]: randomness.word(),
        })
        .expect(400));

    it('rejects a comma-separated list of indices', () =>
      supertestWithoutAuth
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          indices: 'filebeat-*,packetbeat-*',
        })
        .expect(400));
  });
}
