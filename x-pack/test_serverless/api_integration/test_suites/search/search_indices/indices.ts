/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const INTERNAL_API_BASE_PATH = '/internal/search_indices';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('search_indices Indices APIs', function () {
    before(function () {
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    describe('create index', function () {
      const createIndexName = 'a-test-index';
      describe('developer', function () {
        before(async () => {
          // get auth header for Viewer role
          roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('developer');
        });
        after(async () => {
          // Cleanup index created for testing purposes
          try {
            await esDeleteAllIndices(createIndexName);
          } catch (err) {
            log.debug('[Cleanup error] Error deleting index');
            throw err;
          }
          await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
        });

        it('can create a new index', async () => {
          const { body } = await supertestWithoutAuth
            .post(`${INTERNAL_API_BASE_PATH}/indices/create`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              indexName: createIndexName,
            })
            .expect(200);

          expect(body?.index).toBe(createIndexName);
        });
        it('gives a conflict error if the index exists already', async () => {
          await supertestWithoutAuth
            .post(`${INTERNAL_API_BASE_PATH}/indices/create`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              indexName: createIndexName,
            })
            .expect(409);
        });
      });
      describe('viewer', function () {
        before(async () => {
          // get auth header for Viewer role
          roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
        });

        it('cannot create a new index', async () => {
          await supertestWithoutAuth
            .post(`${INTERNAL_API_BASE_PATH}/indices/create`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              indexName: 'a-new-index',
            })
            .expect(403);
        });
      });
    });
  });
}
