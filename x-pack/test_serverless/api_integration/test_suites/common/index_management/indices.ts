/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const INTERNAL_API_BASE_PATH = '/internal/index_management';
const expectedKeys = ['aliases', 'hidden', 'isFrozen', 'primary', 'replica', 'name'].sort();

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const indexManagementService = getService('indexManagement');

  describe('Indices', function () {
    let indexName: string;
    let reload: typeof indexManagementService['indices']['api']['reload'];
    let list: typeof indexManagementService['indices']['api']['list'];
    let deleteIndex: typeof indexManagementService['indices']['api']['deleteIndex'];
    let createIndex: typeof indexManagementService['indices']['helpers']['createIndex'];
    let deleteAllIndices: typeof indexManagementService['indices']['helpers']['deleteAllIndices'];
    let catIndex: typeof indexManagementService['indices']['helpers']['catIndex'];

    before(async () => {
      ({
        indices: {
          api: { reload, list, deleteIndex },
          helpers: { createIndex, deleteAllIndices, catIndex },
        },
      } = indexManagementService);
      log.debug(`Creating index: '${indexName}'`);
      try {
        indexName = await createIndex();
      } catch (err) {
        log.debug('[Setup error] Error creating index');
        throw err;
      }
    });

    after(async () => {
      // Cleanup index created for testing purposes
      try {
        await deleteAllIndices();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting index');
        throw err;
      }
    });

    describe('list', () => {
      it('should list all the indices with the expected properties', async function () {
        // Create an index that we can assert against
        await createIndex('test_index');

        // Verify indices request
        const { body: indices } = await list().set('x-elastic-internal-origin', 'xxx').expect(200);

        // Find the "test_index" created to verify expected keys
        const indexCreated = indices.find((index: { name: string }) => index.name === 'test_index');

        const sortedReceivedKeys = Object.keys(indexCreated).sort();

        expect(sortedReceivedKeys).to.eql(expectedKeys);
      });
    });

    describe('get index', () => {
      it('returns index details for the specified index name', async () => {
        const { body: index } = await supertest
          .get(`${INTERNAL_API_BASE_PATH}/indices/${indexName}`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        expect(index).to.be.ok();

        expect(Object.keys(index).sort()).to.eql(expectedKeys);
      });

      it('throws 404 for a non-existent index', async () => {
        await supertest
          .get(`${INTERNAL_API_BASE_PATH}/indices/non_existent`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
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
        await supertest
          .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send({
            indexName: createIndexName,
          })
          .expect(200);

        const { body: index } = await supertest
          .get(`${INTERNAL_API_BASE_PATH}/indices/${createIndexName}`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        expect(index).to.be.ok();

        expect(Object.keys(index).sort()).to.eql(expectedKeys);
      });

      it('fails to re-create the same index', async () => {
        await supertest
          .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send({
            indexName: createIndexName,
          })
          .expect(400);
      });
    });

    describe('reload', function () {
      it('should list all the indices with the expected properties', async function () {
        // create an index to assert against, otherwise the test is flaky
        await createIndex('reload-test-index');
        const { body } = await reload().set('x-elastic-internal-origin', 'xxx').expect(200);

        const indexCreated = body.find(
          (index: { name: string }) => index.name === 'reload-test-index'
        );
        const sortedReceivedKeys = Object.keys(indexCreated).sort();
        expect(sortedReceivedKeys).to.eql(expectedKeys);
        expect(body.length > 1).to.be(true); // to contrast it with the next test
      });

      it('should allow reloading only certain indices', async () => {
        const index = await createIndex();
        const { body } = await reload([index]).set('x-elastic-internal-origin', 'xxx');

        expect(body.length === 1).to.be(true);
        expect(body[0].name).to.be(index);
      });
    });

    describe('delete indices', () => {
      it('should delete an index', async () => {
        const index = await createIndex();

        const { body: indices1 } = await catIndex(undefined, 'i');
        expect(indices1.map((indexItem) => indexItem.i)).to.contain(index);

        await deleteIndex(index).set('x-elastic-internal-origin', 'xxx').expect(200);

        const { body: indices2 } = await catIndex(undefined, 'i');
        expect(indices2.map((indexItem) => indexItem.i)).not.to.contain(index);
      });

      it('should require index or indices to be provided', async () => {
        const { body } = await deleteIndex().set('x-elastic-internal-origin', 'xxx').expect(400);
        expect(body.message).to.contain('expected value of type [string]');
      });
    });
  });
}
