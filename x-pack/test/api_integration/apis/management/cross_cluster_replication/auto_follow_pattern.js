/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { API_BASE_PATH, REMOTE_CLUSTERS_API_BASE_PATH } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const addCluster = async (clusterName) => {
    const uri = `${REMOTE_CLUSTERS_API_BASE_PATH}`;

    return await supertest
      .post(uri)
      .set('kbn-xsrf', 'xxx')
      .send({
        "name": clusterName,
        "seeds": [
          "localhost:9300"
        ],
        "skipUnavailable": true,
      });
  };

  describe('auto follow patterns', () => {
    const BASE_AUTOFOLLOW_PATTERN = 'auto_follow_patterns';

    describe('list()', () => {
      it('should return an empty object when there are no auto follow patterns', async () => {
        const uri = `${API_BASE_PATH}/${BASE_AUTOFOLLOW_PATTERN}`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({});
      });
    });

    describe('create()', () => {
      const clusterName = 'my-test-cluster';

      let payload;
      let autoFollowId;

      const getUriPath = () => `${API_BASE_PATH}/${BASE_AUTOFOLLOW_PATTERN}/${autoFollowId}`;

      beforeEach(() => {
        payload = {
          remoteCluster: clusterName,
          leaderIndexPatterns:
          [
            'leader-*'
          ],
          followIndexPattern: '{{leader_index}}_follower'
        };

        autoFollowId = 'my-autofollow-pattern';
      });

      it('should throw a Bad Request when cluster is unknown', async () => {
        payload.remote_cluster = 'cluster-never-declared';

        const { body } = await supertest
          .put(getUriPath())
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(400);

        expect(body.cause[0]).to.contain('unknown cluster');
      });

      it('should create an auto-follow pattern', async () => {
        await addCluster(clusterName);

        const { body } = await supertest
          .put(getUriPath())
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(200);

        expect(body.acknowledged).to.eql(true);
      });
    });
  });
}
