/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '../../../../../legacy/plugins/cross_cluster_replication/common/constants';
import { getFollowerIndexPayload } from './fixtures';
import { registerHelpers as registerElasticSearchHelpers, getRandomString } from './lib';
import { registerHelpers as registerRemoteClustersHelpers } from './remote_clusters.helpers';
import { registerHelpers as registerFollowerIndicesnHelpers } from './follower_indices.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const { addCluster, deleteAllClusters } = registerRemoteClustersHelpers(supertest);
  const {
    loadFollowerIndices,
    getFollowerIndex,
    createFollowerIndex,
    unfollowAll,
  } = registerFollowerIndicesnHelpers(supertest);

  const { createIndex, deleteAllIndices } = registerElasticSearchHelpers(es);

  describe('follower indices', function () {
    this.tags(['skipCloud']);

    before(() => addCluster());

    after(() => Promise.all([
      deleteAllIndices(),
      unfollowAll().then(deleteAllClusters)
    ]));

    describe('list()', () => {
      it('should return an empty array when there are no follower indices', async () => {
        const { body } = await loadFollowerIndices().expect(200);

        expect(body).to.eql({ indices: [] });
      });
    });

    describe('create()', () => {
      it('should throw a 404 error when cluster is unknown', async () => {
        const payload = getFollowerIndexPayload();
        payload.remoteCluster = 'unknown-cluster';

        const { body } = await createFollowerIndex(undefined, payload).expect(404);
        expect(body.cause[0]).to.contain('no such remote cluster');
      });

      it('should throw a 404 error trying to follow an unknown index', async () => {
        const payload = getFollowerIndexPayload();
        const { body } = await createFollowerIndex(undefined, payload).expect(404);
        expect(body.cause[0]).to.contain('no such index');
      });

      it('should create a follower index that follows an existing remote index', async () => {
        // First let's create an index to follow
        const leaderIndex = await createIndex();

        const payload = getFollowerIndexPayload(leaderIndex);
        const { body } = await createFollowerIndex(undefined, payload).expect(200);

        // There is a race condition in which Elasticsearch can respond without acknowledging,
        // i.e. `body .follow_index_shards_acked` is sometimes true and sometimes false.
        // By only asserting that `follow_index_created` is true, we eliminate this flakiness.
        expect(body.follow_index_created).to.eql(true);
      });
    });

    describe('get()', () => {
      it('should return a 404 when the follower index does not exist', async () => {
        const name = getRandomString();
        const { body } = await getFollowerIndex(name).expect(404);

        expect(body.cause[0]).to.contain('no such index');
      });

      it('should return a follower index that was created', async () => {
        const leaderIndex = await createIndex();

        const name = getRandomString();
        const payload = getFollowerIndexPayload(leaderIndex);
        await createFollowerIndex(name, payload);

        const { body } = await getFollowerIndex(name).expect(200);

        expect(body.leaderIndex).to.eql(leaderIndex);
        expect(body.remoteCluster).to.eql(payload.remoteCluster);
      });
    });

    describe('Advanced settings', () => {
      it('hard-coded values should match Elasticsearch default values', async () => {
        /**
         * To make sure that the hard-coded values in the client match the default
         * from Elasticsearch, we will create a follower index without any advanced settings.
         * When we then retrieve the follower index it will have all the advanced settings
         * coming from ES. We can then compare those settings with our hard-coded values.
         */
        const leaderIndex = await createIndex();

        const name = getRandomString();
        const payload = getFollowerIndexPayload(leaderIndex);
        await createFollowerIndex(name, payload);

        const { body } = await getFollowerIndex(name);

        // We "only" check the settings if the follower index is in "active" state.
        // It can happen that a race condition returns the index as "paused". In this case
        // no advanced settings value is returned by ES.
        if (body.status !== 'active') {
          return;
        }

        Object.entries(FOLLOWER_INDEX_ADVANCED_SETTINGS).forEach(([key, value]) => {
          expect(value).to.eql(body[key]);
        });
      });
    });
  });
}
