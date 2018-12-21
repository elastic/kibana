/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import Chance from 'chance';
import { API_BASE_PATH, REMOTE_CLUSTERS_API_BASE_PATH } from './constants';

const chance = new Chance();

export default function ({ getService }) {
  const supertest = getService('supertest');

  const CLUSTER_NAME = 'test_cluster';
  const BASE_AUTOFOLLOW_PATTERN = 'auto_follow_patterns';
  const CHARS_POOL = 'abcdefghijklmnopqrstuvwxyz';

  const addCluster = async (name = CLUSTER_NAME) => {
    const uri = `${REMOTE_CLUSTERS_API_BASE_PATH}`;

    return await supertest
      .post(uri)
      .set('kbn-xsrf', 'xxx')
      .send({
        "name": name,
        "seeds": [
          "localhost:9300"
        ],
        "skipUnavailable": true,
      });
  };

  const deleteCluster = async (name = CLUSTER_NAME) => {
    const uri = `${REMOTE_CLUSTERS_API_BASE_PATH}/${name}`;

    return await supertest
      .delete(uri)
      .set('kbn-xsrf', 'xxx')
      .expect(200);
  };

  const getAutoFollowPatternUri = (autoFollowName = chance.string({ pool: CHARS_POOL })) => (
    `${API_BASE_PATH}/${BASE_AUTOFOLLOW_PATTERN}/${autoFollowName}`
  );

  const getAutoFollowIndexPayload = () => ({
    remoteCluster: CLUSTER_NAME,
    leaderIndexPatterns:
    [
      'leader-*'
    ],
    followIndexPattern: '{{leader_index}}_follower'
  });

  const createAutoFollowIndexRequest = (payload = getAutoFollowIndexPayload(), name = chance.string({ pool: CHARS_POOL })) => (
    supertest
      .put(getAutoFollowPatternUri(name))
      .set('kbn-xsrf', 'xxx')
      .send(payload)
  );

  describe('auto follow patterns', () => {

    describe('list()', () => {
      it('should return an empty object when there are no auto follow patterns', async () => {
        const uri = `${API_BASE_PATH}/${BASE_AUTOFOLLOW_PATTERN}`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({ patterns: [] });
      });
    });

    describe.skip('create()', () => {
      let payload;

      beforeEach(() => {
        payload = getAutoFollowIndexPayload();
      });

      it('should throw a Bad Request when cluster is unknown', async () => {
        payload.remote_cluster = 'cluster-never-declared';

        const { body } = await createAutoFollowIndexRequest(payload)
          .expect(400);

        expect(body.cause[0]).to.contain('not licensed for [ccr]');
      });

      it('should create an auto-follow pattern when cluster is known', async () => {
        await addCluster();

        const { body } = await createAutoFollowIndexRequest()
          .expect(200);

        expect(body.acknowledged).to.eql(true);

        await deleteCluster();

        // TODO delete the auto-follow pattern to clean up
      });
    });

    describe.skip('get()', () => {
      it('should return a 404 when auto-follow pattern is not found', async () => {
        const uri = getAutoFollowPatternUri();
        const { body } = await supertest
          .get(uri)
          .expect(404);

        expect(body.cause).not.to.be(undefined);
      });

      it('should return an auto-follow pattern that was created', async () => {
        const name = chance.string({ pool: CHARS_POOL });
        const autoFollowPattern = getAutoFollowIndexPayload();
        const uri = getAutoFollowPatternUri(name);

        await addCluster();
        await createAutoFollowIndexRequest(autoFollowPattern, name);

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({
          name,
          remoteCluster: 'test_cluster',
          leaderIndexPatterns: ['leader-*'],
          followIndexPattern: '{{leader_index}}_follower'
        });

        await deleteCluster();
      });
    });
  });
}
