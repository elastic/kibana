/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '../../../../../plugins/cross_cluster_replication/common/constants';
import { API_BASE_PATH } from './constants';
import { initClusterHelpers, initElasticsearchIndicesHelpers, getRandomString } from './lib';

const FOLLOWER_INDICES_API_BASE_PATH = API_BASE_PATH + '/follower_indices';

export default function ({ getService }) {
  let followerIndicesCreated = [];
  const supertest = getService('supertest');
  const es = getService('es');

  const { CLUSTER_NAME, addCluster, deleteAllClusters } = initClusterHelpers(supertest);
  const { createIndex, deleteAllIndices } = initElasticsearchIndicesHelpers(es);

  const getFollowerIndexPayload = (leaderIndexName = getRandomString(), remoteCluster = CLUSTER_NAME, advancedSettings = {}) => ({
    remoteCluster,
    leaderIndex: leaderIndexName,
    ...advancedSettings,
  });

  const createFollowerIndexRequest = (name = getRandomString(), payload = getFollowerIndexPayload()) => {
    followerIndicesCreated.push(name);

    return supertest
      .post(FOLLOWER_INDICES_API_BASE_PATH)
      .set('kbn-xsrf', 'xxx')
      .send({ ...payload, name });
  };

  const deleteFollowerIndicesCreated = () => {
    const ids = followerIndicesCreated.map(_id => encodeURIComponent(_id)).join(',');
    return supertest
      .put(`${FOLLOWER_INDICES_API_BASE_PATH}/${ids}/unfollow`)
      .set('kbn-xsrf', 'xxx')
      .then(() => supertest.get(FOLLOWER_INDICES_API_BASE_PATH))
      .then(({ body }) => {
        if (body.indices.length) {
          // There are still some index left to delete. Call recursively
          // until all follower indices are removed.
          followerIndicesCreated = body.indices.map(i => i.name);
          return deleteFollowerIndicesCreated();
        }

        followerIndicesCreated = [];
      });
  };

  const cleanUp = () => (
    Promise.all([
      deleteAllClusters(),
      deleteAllIndices(),
      deleteFollowerIndicesCreated()
    ]).catch(err => {
      console.log('ERROR cleaning up...');
      console.log(err);
    })
  );

  // Flaky tests; possible race condition with ES.
  describe('follower indices', () => {
    before(() => addCluster());
    after(() => cleanUp());

    describe('list()', () => {
      it('should return an empty array when there are no follower indices', async () => {
        const { body } = await supertest
          .get(FOLLOWER_INDICES_API_BASE_PATH)
          .expect(200);

        expect(body).to.eql({ indices: [] });
      });
    });

    describe('create()', () => {
      it('should throw a 404 error when cluster is unknown', async () => {
        const payload = getFollowerIndexPayload();
        payload.remoteCluster = 'unknown-cluster';

        const { body } = await createFollowerIndexRequest(undefined, payload).expect(404);
        expect(body.cause[0]).to.contain('no such remote cluster');
      });

      it('should throw a 404 error trying to follow an unknown index', async () => {
        const payload = getFollowerIndexPayload();
        const { body } = await createFollowerIndexRequest(undefined, payload).expect(404);
        expect(body.cause[0]).to.contain('no such index');
      });

      it('should create a follower index that follows an existing remote index', async () => {
        // First let's create an index to follow
        const leaderIndex = await createIndex();

        const payload = getFollowerIndexPayload(leaderIndex);
        const { body } = await createFollowerIndexRequest(undefined, payload).expect(200);

        // There is a race condition in which Elasticsearch can respond without acknowledging,
        // i.e. `body .follow_index_shards_acked` is sometimes true and sometimes false.
        // By only asserting that `follow_index_created` is true, we eliminate this flakiness.
        expect(body.follow_index_created).to.eql(true);
      });
    });

    describe('get()', () => {
      it('should return a 404 when the follower index does not exist', async () => {
        const name = getRandomString();
        const { body } = await supertest
          .get(`${FOLLOWER_INDICES_API_BASE_PATH}/${name}`)
          .expect(404);

        expect(body.cause[0]).to.contain('no such index');
      });

      it('should return a follower index that was created', async () => {
        const leaderIndex = await createIndex();

        const name = getRandomString();
        const payload = getFollowerIndexPayload(leaderIndex);
        await createFollowerIndexRequest(name, payload).expect(200);

        const { body } = await supertest
          .get(`${FOLLOWER_INDICES_API_BASE_PATH}/${name}`)
          .expect(200);

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
        await createFollowerIndexRequest(name, payload).expect(200);

        const { body } = await supertest.get(`${FOLLOWER_INDICES_API_BASE_PATH}/${name}`);

        // We "only" check the settings if the follower index is in "active" state.
        // It can happen that a race condition returns the index as "paused". In this case
        // no advanced settings value is returned by ES.
        if (body.status === 'active') {
          Object.entries(FOLLOWER_INDEX_ADVANCED_SETTINGS).forEach(([key, value]) => {
            expect(value).to.eql(body[key]);
          });
        } else {
          expect(true).eql(true);
        }
      });
    });
  });
}
