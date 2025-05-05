/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const INTERNAL_API_BASE_PATH = '/internal/index_management';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const svlIndicesApi = getService('svlIndicesApi');
  const svlIndicesHelpers = getService('svlIndicesHelpers');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
  let roleAuthc: RoleCredentials;

  describe('Indices', function () {
    let indexName: string;

    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      log.debug(`Creating index: '${indexName}'`);
      try {
        indexName = await svlIndicesHelpers.createIndex();
      } catch (err) {
        log.debug('[Setup error] Error creating index');
        throw err;
      }
    });

    after(async () => {
      // Cleanup index created for testing purposes
      try {
        await svlIndicesHelpers.deleteAllIndices();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting index');
        throw err;
      }
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('list', () => {
      it('should list all the indices with the expected properties', async function () {
        // Create an index that we can assert against
        await svlIndicesHelpers.createIndex('test_index');

        // Verify indices request
        const { status, body: indices } = await svlIndicesApi.list(roleAuthc);
        expect(status).to.eql(200);

        // Find the "test_index" created to verify expected keys
        const indexCreated = indices.find((index: { name: string }) => index.name === 'test_index');

        const sortedReceivedKeys = Object.keys(indexCreated).sort();

        expect(sortedReceivedKeys).to.eql([
          'aliases',
          'documents',
          'hidden',
          'isFrozen',
          'name',
          'size',
        ]);
      });
    });

    describe('get index', () => {
      it('returns index details for the specified index name', async () => {
        const { body: index } = await supertestAdminWithCookieCredentials
          .get(`${INTERNAL_API_BASE_PATH}/indices/${indexName}`)
          .expect(200);

        expect(index).to.be.ok();

        expect(Object.keys(index).sort()).to.eql([
          'aliases',
          'documents',
          'hidden',
          'isFrozen',
          'name',
          'size',
        ]);
      });

      it('throws 404 for a non-existent index', async () => {
        await supertestAdminWithCookieCredentials
          .get(`${INTERNAL_API_BASE_PATH}/indices/non_existent`)
          .expect(404);
      });
    });

    describe('create index', () => {
      const createIndexName = 'a-test-index';
      after(async () => {
        // Cleanup index created for testing purposes
        try {
          await es.indices.delete({
            index: createIndexName,
          });
        } catch (err) {
          log.debug('[Cleanup error] Error deleting "a-test-index" index');
          throw err;
        }
      });

      it('can create a new index', async () => {
        await supertestAdminWithCookieCredentials
          .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
          .send({
            indexName: createIndexName,
            indexMode: 'standard',
          })
          .expect(200);

        const { body: index } = await supertestAdminWithCookieCredentials
          .get(`${INTERNAL_API_BASE_PATH}/indices/${createIndexName}`)
          .expect(200);

        expect(index).to.be.ok();

        expect(Object.keys(index).sort()).to.eql([
          'aliases',
          'documents',
          'hidden',
          'isFrozen',
          'name',
          'size',
        ]);
      });

      it('fails to re-create the same index', async () => {
        await supertestAdminWithCookieCredentials
          .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
          .send({
            indexName: createIndexName,
            indexMode: 'standard',
          })
          .expect(400);
      });
    });

    describe('reload', function () {
      it('should list all the indices with the expected properties', async function () {
        // create an index to assert against, otherwise the test is flaky
        await svlIndicesHelpers.createIndex('reload-test-index');
        const { status, body } = await svlIndicesApi.reload(roleAuthc);
        svlCommonApi.assertResponseStatusCode(200, status, body);

        const indexCreated = body.find(
          (index: { name: string }) => index.name === 'reload-test-index'
        );
        const sortedReceivedKeys = Object.keys(indexCreated).sort();
        expect(sortedReceivedKeys).to.eql([
          'aliases',
          'documents',
          'hidden',
          'isFrozen',
          'name',
          'size',
        ]);
        expect(body.length > 1).to.be(true); // to contrast it with the next test
      });

      it('should allow reloading only certain indices', async () => {
        const index = await svlIndicesHelpers.createIndex();
        const { body } = await svlIndicesApi.reload(roleAuthc, [index]);

        expect(body.length === 1).to.be(true);
        expect(body[0].name).to.be(index);
      });
    });

    describe('delete indices', () => {
      it('should delete an index', async () => {
        const index = await svlIndicesHelpers.createIndex();

        const { body: indices1 } = await svlIndicesHelpers.catIndex(undefined, 'i');
        expect(indices1.map((indexItem) => indexItem.i)).to.contain(index);

        const { status } = await svlIndicesApi.deleteIndex(roleAuthc, index);
        expect(status).to.eql(200);

        const { body: indices2 } = await svlIndicesHelpers.catIndex(undefined, 'i');
        expect(indices2.map((indexItem) => indexItem.i)).not.to.contain(index);
      });

      it('should require index or indices to be provided', async () => {
        const { status, body } = await svlIndicesApi.deleteIndex(roleAuthc);
        expect(status).to.eql(400);
        expect(body.message).to.contain('expected value of type [string]');
      });
    });
  });
}
