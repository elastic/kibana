/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const INTERNAL_API_BASE_PATH = '/internal/search_indices';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestDeveloperWithCookieCredentials: SupertestWithRoleScopeType;
  let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

  describe('search_indices Indices APIs', function () {
    describe('create index', function () {
      const createIndexName = 'a-test-index';
      describe('developer', function () {
        before(async () => {
          supertestDeveloperWithCookieCredentials =
            await roleScopedSupertest.getSupertestWithRoleScope('developer', {
              useCookieHeader: true,
              withInternalHeaders: true,
            });
        });

        after(async () => {
          // Cleanup index created for testing purposes
          try {
            await esDeleteAllIndices(createIndexName);
          } catch (err) {
            log.debug('[Cleanup error] Error deleting index');
            throw err;
          }
        });

        it('can create a new index', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .post(`${INTERNAL_API_BASE_PATH}/indices/create`)
            .send({
              indexName: createIndexName,
            })
            .expect(200);

          expect(body?.index).toBe(createIndexName);
        });
        it('gives a conflict error if the index exists already', async () => {
          await supertestDeveloperWithCookieCredentials
            .post(`${INTERNAL_API_BASE_PATH}/indices/create`)
            .send({
              indexName: createIndexName,
            })
            .expect(409);
        });
      });
      describe('viewer', function () {
        before(async () => {
          supertestViewerWithCookieCredentials =
            await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
              useCookieHeader: true,
              withInternalHeaders: true,
            });
        });

        it('cannot create a new index', async () => {
          await supertestViewerWithCookieCredentials
            .post(`${INTERNAL_API_BASE_PATH}/indices/create`)
            .send({
              indexName: 'a-new-index',
            })
            .expect(403);
        });
      });
    });
  });
}
