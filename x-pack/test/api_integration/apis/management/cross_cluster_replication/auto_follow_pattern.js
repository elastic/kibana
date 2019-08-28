/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { getRandomString } from './lib';
import { getAutoFollowIndexPayload } from './fixtures';
import { registerHelpers as registerRemoteClustersHelpers } from './remote_clusters.helpers';
import { registerHelpers as registerAutoFollowPatternHelpers } from './auto_follow_pattern.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const { addCluster, deleteAllClusters } = registerRemoteClustersHelpers(supertest);
  const {
    loadAutoFollowPatterns,
    getAutoFollowPattern,
    createAutoFollowPattern,
    deleteAllAutoFollowPatterns
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
        const payload = getAutoFollowIndexPayload();
        payload.remoteCluster = 'unknown-cluster';

        const { body } = await createAutoFollowPattern(undefined, payload).expect(404);
        expect(body.cause[0]).to.contain('no such remote cluster');
      });
    });

    describe('when remote cluster exists', () => {
      before(() => addCluster());

      describe('create()', () => {
        it('should create an auto-follow pattern when cluster is known', async () => {
          const name = getRandomString();
          const { body } = await createAutoFollowPattern(name).expect(200);

          expect(body.acknowledged).to.eql(true);
        });
      });

      describe('get()', () => {
        it('should return a 404 when the auto-follow pattern is not found', async () => {
          const name = getRandomString();
          const { body } = await getAutoFollowPattern(name).expect(404);

          expect(body.cause).not.to.be(undefined);
        });

        it('should return an auto-follow pattern that was created', async () => {
          const name = getRandomString();
          const autoFollowPattern = getAutoFollowIndexPayload();

          await createAutoFollowPattern(name, autoFollowPattern);

          const { body } = await getAutoFollowPattern(name).expect(200);

          expect(body).to.eql({ ...autoFollowPattern, name });
        });
      });
    });
  });
}
