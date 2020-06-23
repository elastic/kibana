/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { REMOTE_CLUSTER_NAME } from './constants';
import { registerHelpers as registerRemoteClustersHelpers } from './remote_clusters.helpers';
import { registerHelpers as registerAutoFollowPatternHelpers } from './auto_follow_pattern.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { addCluster, deleteAllClusters } = registerRemoteClustersHelpers(supertest);
  const {
    loadAutoFollowPatterns,
    getAutoFollowPattern,
    createAutoFollowPattern,
    deleteAllAutoFollowPatterns,
  } = registerAutoFollowPatternHelpers(supertest);

  describe('auto follow patterns', function () {
    this.tags(['skipCloud']);

    after(() => deleteAllAutoFollowPatterns().then(deleteAllClusters));

    describe('list()', () => {
      it('should return an empty object when there are no auto follow patterns', async () => {
        const { body } = await loadAutoFollowPatterns().expect(200);

        expect(body).to.eql({ patterns: [] });
      });
    });

    describe('when remote cluster does not exist', () => {
      it('should throw a 404 error when cluster is unknown', async () => {
        const { body } = await createAutoFollowPattern({
          id: 'pattern0',
          remoteCluster: 'unknown-cluster',
          leaderIndexPatterns: ['leader-*'],
          followIndexPattern: '{{leader_index}}_follower',
        });

        expect(body.statusCode).to.be(404);
        expect(body.attributes.cause[0]).to.contain('no such remote cluster');
      });
    });

    describe('when remote cluster exists', () => {
      before(async () => addCluster());

      describe('create()', () => {
        it('should create an auto-follow pattern when cluster is known', async () => {
          const { body, statusCode } = await createAutoFollowPattern({
            id: 'pattern1',
            remoteCluster: REMOTE_CLUSTER_NAME,
            leaderIndexPatterns: ['leader-*'],
            followIndexPattern: '{{leader_index}}_follower',
          });

          expect(statusCode).to.be(200);
          expect(body.acknowledged).to.eql(true);
        });
      });

      describe('get()', () => {
        it('should return a 404 when the auto-follow pattern is not found', async () => {
          const { body } = await getAutoFollowPattern('missing-pattern');
          expect(body.statusCode).to.be(404);
          expect(body.attributes.cause).not.to.be(undefined);
        });

        it('should return an auto-follow pattern that was created', async () => {
          await createAutoFollowPattern({
            id: 'pattern2',
            remoteCluster: REMOTE_CLUSTER_NAME,
            leaderIndexPatterns: ['leader-*'],
            followIndexPattern: '{{leader_index}}_follower',
          });

          const { body, statusCode } = await getAutoFollowPattern('pattern2');

          expect(statusCode).to.be(200);
          expect(body).to.eql({
            name: 'pattern2',
            remoteCluster: REMOTE_CLUSTER_NAME,
            active: true,
            leaderIndexPatterns: ['leader-*'],
            followIndexPattern: '{{leader_index}}_follower',
          });
        });
      });
    });
  });
}
