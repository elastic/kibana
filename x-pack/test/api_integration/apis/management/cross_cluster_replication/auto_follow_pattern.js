/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { API_BASE_PATH } from './constants';

import { initClusterHelpers, getRandomString } from './lib';

const AUTO_FOLLOW_PATTERNS_API_BASE_PATH = API_BASE_PATH + '/auto_follow_patterns';

export default function ({ getService }) {
  let autoFollowPatternsCreated = [];
  const supertest = getService('supertest');

  const { CLUSTER_NAME, addCluster, deleteAllClusters } = initClusterHelpers(supertest);

  const deleteAutoFollowPatternRequest = (name) => (
    supertest
      .delete(`${AUTO_FOLLOW_PATTERNS_API_BASE_PATH}/${name}`)
      .set('kbn-xsrf', 'xxx')
  );

  const getAutoFollowIndexPayload = () => ({
    remoteCluster: CLUSTER_NAME,
    leaderIndexPatterns: [ 'leader-*'],
    followIndexPattern: '{{leader_index}}_follower'
  });

  const createAutoFollowIndexRequest = (name = getRandomString(), payload = getAutoFollowIndexPayload()) => {
    autoFollowPatternsCreated.push(name);

    return supertest
      .post(AUTO_FOLLOW_PATTERNS_API_BASE_PATH)
      .set('kbn-xsrf', 'xxx')
      .send({ ...payload, id: name });
  };

  const cleanUp = () => (
    Promise.all([deleteAllClusters(), ...autoFollowPatternsCreated.map(deleteAutoFollowPatternRequest)])
      .then(() => {
        autoFollowPatternsCreated = [];
      })
  );

  describe('auto follow patterns', () => {
    afterEach(() => {
      return cleanUp();
    });

    describe('list()', () => {
      it('should return an empty object when there are no auto follow patterns', async () => {
        const uri = `${AUTO_FOLLOW_PATTERNS_API_BASE_PATH}`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({ patterns: [] });
      });
    });

    describe('create()', () => {
      let payload;

      beforeEach(() => {
        payload = getAutoFollowIndexPayload();
      });

      it('should throw a 404 error when cluster is unknown', async () => {
        payload.remoteCluster = 'unknown-cluster';

        const { body } = await createAutoFollowIndexRequest(undefined, payload).expect(404);
        expect(body.cause[0]).to.contain('no such remote cluster');
      });

      it('should create an auto-follow pattern when cluster is known', async () => {
        await addCluster();

        const name = getRandomString();
        const { body } = await createAutoFollowIndexRequest(name).expect(200);

        expect(body.acknowledged).to.eql(true);
      });
    });

    describe('get()', () => {
      it('should return a 404 when the auto-follow pattern is not found', async () => {
        const name = getRandomString();
        const { body } = await supertest
          .get(`${AUTO_FOLLOW_PATTERNS_API_BASE_PATH}/${name}`)
          .expect(404);

        expect(body.cause).not.to.be(undefined);
      });

      it('should return an auto-follow pattern that was created', async () => {
        const name = getRandomString();
        const autoFollowPattern = getAutoFollowIndexPayload();

        await addCluster();
        await createAutoFollowIndexRequest(name, autoFollowPattern);

        const { body } = await supertest
          .get(`${AUTO_FOLLOW_PATTERNS_API_BASE_PATH}/${name}`)
          .expect(200);

        expect(body).to.eql({ ...autoFollowPattern, name });
      });
    });
  });
}
