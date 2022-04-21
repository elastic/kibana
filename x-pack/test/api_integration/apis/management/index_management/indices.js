/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers } from './lib';
import { registerHelpers } from './indices.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const {
    createIndex,
    catIndex,
    indexStats,
    cleanUp: cleanUpEsResources,
  } = initElasticsearchHelpers(getService);

  const {
    closeIndex,
    openIndex,
    deleteIndex,
    flushIndex,
    refreshIndex,
    forceMerge,
    unfreeze,
    list,
    reload,
    clearCache,
  } = registerHelpers({ supertest });

  describe('indices', () => {
    after(() => Promise.all([cleanUpEsResources()]));

    describe('clear cache', () => {
      it('should clear the cache on all indices', async () => {
        await clearCache('*').expect(200);
      });

      it('should clear the cache on a single index', async () => {
        const index = await createIndex();
        await clearCache(index).expect(200);
      });
    });

    describe('close', function () {
      // The Cloud backend disallows users from closing indices.
      this.tags(['skipCloud']);

      it('should close an index', async () => {
        const index = await createIndex();

        // Make sure the index is open
        const {
          body: [cat1],
        } = await catIndex(index);
        expect(cat1.status).to.be('open');

        await closeIndex(index).expect(200);

        // Make sure the index has been closed
        const {
          body: [cat2],
        } = await catIndex(index);
        expect(cat2.status).to.be('close');
      });
    });

    describe('open', function () {
      // The Cloud backend disallows users from closing indices, so there's no point testing
      // the open behavior.
      this.tags(['skipCloud']);

      it('should open an index', async () => {
        const index = await createIndex();

        await closeIndex(index);

        // Make sure the index is closed
        const {
          body: [cat1],
        } = await catIndex(index);
        expect(cat1.status).to.be('close');

        await openIndex(index).expect(200);

        // Make sure the index is opened
        const {
          body: [cat2],
        } = await catIndex(index);
        expect(cat2.status).to.be('open');
      });
    });

    describe('delete', () => {
      it('should delete an index', async () => {
        const index = await createIndex();

        const { body: indices1 } = await catIndex(undefined, 'i');
        expect(indices1.map((index) => index.i)).to.contain(index);

        await deleteIndex([index]).expect(200);

        const { body: indices2 } = await catIndex(undefined, 'i');
        expect(indices2.map((index) => index.i)).not.to.contain(index);
      });

      it('should require index or indices to be provided', async () => {
        const { body } = await deleteIndex().expect(400);
        expect(body.message).to.contain('expected value of type [string]');
      });
    });

    describe('flush', () => {
      it('should flush an index', async () => {
        const index = await createIndex();

        const {
          body: { indices: indices1 },
        } = await indexStats(index, 'flush');
        expect(indices1[index].total.flush.total).to.be(0);

        await flushIndex(index).expect(200);

        const {
          body: { indices: indices2 },
        } = await indexStats(index, 'flush');
        expect(indices2[index].total.flush.total).to.be(1);
      });
    });

    describe('refresh', () => {
      it('should refresh an index', async () => {
        const index = await createIndex();

        const {
          body: { indices: indices1 },
        } = await indexStats(index, 'refresh');
        const previousRefreshes = indices1[index].total.refresh.total;

        await refreshIndex(index).expect(200);

        const {
          body: { indices: indices2 },
        } = await indexStats(index, 'refresh');
        expect(indices2[index].total.refresh.total).to.be(previousRefreshes + 1);
      });
    });

    describe('forcemerge', () => {
      it('should force merge an index', async () => {
        const index = await createIndex();
        await forceMerge(index).expect(200);
      });

      it('should allow to define the number of segments', async () => {
        const index = await createIndex();
        await forceMerge(index, { maxNumSegments: 1 }).expect(200);
      });
    });

    describe('unfreeze', () => {
      it('should unfreeze an index', async () => {
        const index = await createIndex();

        // Even if the index is already unfrozen, calling the unfreeze api
        // will have no effect on it and will return a 200.
        await unfreeze(index).expect(200);
        const {
          body: [cat2],
        } = await catIndex(index, 'sth');
        expect(cat2.sth).to.be('false');
      });
    });

    describe('list', function () {
      this.tags(['skipCloud']);

      it('should list all the indices with the expected properties and data enrichers', async function () {
        // Create an index that we can assert against
        await createIndex('test_index');

        // Verify indices request
        const { body: indices } = await list().expect(200);

        // Find the "test_index" created to verify expected keys
        const indexCreated = indices.find((index) => index.name === 'test_index');

        const expectedKeys = [
          'health',
          'hidden',
          'status',
          'name',
          'uuid',
          'primary',
          'replica',
          'documents',
          'documents_deleted',
          'size',
          'primary_size',
          'isFrozen',
          'aliases',
          // Cloud disables CCR, so wouldn't expect follower indices.
          'isFollowerIndex', // data enricher
          'ilm', // data enricher
          'isRollupIndex', // data enricher
        ];
        // We need to sort the keys before comparing then, because race conditions
        // can cause enrichers to register in non-deterministic order.
        const sortedExpectedKeys = expectedKeys.sort();
        const sortedReceivedKeys = Object.keys(indexCreated).sort();

        expect(sortedReceivedKeys).to.eql(sortedExpectedKeys);
      });
    });

    describe('reload', function () {
      describe('(not on Cloud)', function () {
        this.tags(['skipCloud']);

        it('should list all the indices with the expected properties and data enrichers', async function () {
          // create an index to assert against, otherwise the test is flaky
          await createIndex('reload-test-index');
          const { body } = await reload().expect(200);
          const expectedKeys = [
            'health',
            'hidden',
            'status',
            'name',
            'uuid',
            'primary',
            'replica',
            'documents',
            'documents_deleted',
            'size',
            'primary_size',
            'isFrozen',
            'aliases',
            // Cloud disables CCR, so wouldn't expect follower indices.
            'isFollowerIndex', // data enricher
            'ilm', // data enricher
            'isRollupIndex', // data enricher
          ];
          // We need to sort the keys before comparing then, because race conditions
          // can cause enrichers to register in non-deterministic order.
          const sortedExpectedKeys = expectedKeys.sort();

          const indexCreated = body.find((index) => index.name === 'reload-test-index');
          const sortedReceivedKeys = Object.keys(indexCreated).sort();
          expect(sortedReceivedKeys).to.eql(sortedExpectedKeys);
          expect(body.length > 1).to.be(true); // to contrast it with the next test
        });
      });

      it('should allow reloading only certain indices', async () => {
        const index = await createIndex();
        const { body } = await reload([index]);

        expect(body.length === 1).to.be(true);
        expect(body[0].name).to.be(index);
      });
    });
  });
}
