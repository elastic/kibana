/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { initElasticsearchHelpers } from './lib';
import { registerHelpers } from './indices.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    createIndex,
    catIndex,
    indexStats,
    cleanUp: cleanUpEsResources
  } = initElasticsearchHelpers(es);

  const {
    closeIndex,
    openIndex,
    deleteIndex,
    flushIndex,
    refreshIndex,
    forceMerge,
    freeze,
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
        const [cat1] = await catIndex(index);
        expect(cat1.status).to.be('open');

        await closeIndex(index).expect(200);

        // Make sure the index has been closed
        const [cat2] = await catIndex(index);
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
        const [cat1] = await catIndex(index);
        expect(cat1.status).to.be('close');

        await openIndex(index).expect(200);

        // Make sure the index is opened
        const [cat2] = await catIndex(index);
        expect(cat2.status).to.be('open');
      });
    });

    describe('delete', () => {
      it('should delete an index', async () => {
        const index = await createIndex();

        const indices1 = await catIndex(undefined, 'i');
        expect(indices1.map(index => index.i)).to.contain(index);

        await deleteIndex([index]).expect(200);

        const indices2 = await catIndex(undefined, 'i');
        expect(indices2.map(index => index.i)).not.to.contain(index);
      });

      it('should require index or indices to be provided', async () => {
        const { body } = await deleteIndex().expect(400);
        expect(body.message).to.contain('index / indices is missing');
      });
    });

    describe('flush', () => {
      it('should flush an index', async () => {
        const index = await createIndex();

        const { indices: indices1 } = await indexStats(index, 'flush');
        expect(indices1[index].total.flush.total).to.be(0);

        await flushIndex(index).expect(200);

        const { indices: indices2 } = await indexStats(index, 'flush');
        expect(indices2[index].total.flush.total).to.be(1);
      });
    });

    describe('refresh', () => {
      it('should refresh an index', async () => {
        const index = await createIndex();

        const { indices: indices1 } = await indexStats(index, 'refresh');
        const previousRefreshes = indices1[index].total.refresh.total;

        await refreshIndex(index).expect(200);

        const { indices: indices2 } = await indexStats(index, 'refresh');
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
        await forceMerge(index, { max_num_segments: 1 }).expect(200);
      });
    });

    describe('freeze', () => {
      it('should freeze an index', async () => {
        const index = await createIndex();
        // "sth" correspond to search throttling. Frozen indices are normal indices
        // with search throttling turned on.
        const [cat1] = await catIndex(index, 'sth');
        expect(cat1.sth).to.be('false');

        await freeze(index).expect(200);

        const [cat2] = await catIndex(index, 'sth');
        expect(cat2.sth).to.be('true');
      });
    });

    describe('unfreeze', () => {
      it('should unfreeze an index', async () => {
        const index = await createIndex();

        await freeze(index).expect(200);
        const [cat1] = await catIndex(index, 'sth');
        expect(cat1.sth).to.be('true');

        await unfreeze(index).expect(200);
        const [cat2] = await catIndex(index, 'sth');
        expect(cat2.sth).to.be('false');
      });
    });

    describe('list', function () {
      this.tags(['skipCloud']);

      it('should list all the indices with the expected properties and data enrichers', async function () {
        const { body } = await list().expect(200);
        const expectedKeys = [
          'health',
          'status',
          'name',
          'uuid',
          'primary',
          'replica',
          'documents',
          'size',
          'isFrozen',
          'aliases',
          'ilm', // data enricher
          'isRollupIndex', // data enricher
          // Cloud disables CCR, so wouldn't expect follower indices.
          'isFollowerIndex' // data enricher
        ];
        expect(Object.keys(body[0])).to.eql(expectedKeys);
      });
    });

    describe('reload', function () {
      describe('(not on Cloud)', function () {
        this.tags(['skipCloud']);

        it('should list all the indices with the expected properties and data enrichers', async function () {
          const { body } = await reload().expect(200);
          const expectedKeys = [
            'health',
            'status',
            'name',
            'uuid',
            'primary',
            'replica',
            'documents',
            'size',
            'isFrozen',
            'aliases',
            'ilm', // data enricher
            'isRollupIndex', // data enricher
            // Cloud disables CCR, so wouldn't expect follower indices.
            'isFollowerIndex' // data enricher
          ];
          expect(Object.keys(body[0])).to.eql(expectedKeys);
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
