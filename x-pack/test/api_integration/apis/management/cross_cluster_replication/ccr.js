/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers } from './ccr.helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const {
    getAutoFollowStats,
    getPermissions,
  } = registerHelpers(supertest);

  describe('ccr', () => {
    describe('auto-follow pattern stats()', () => {
      it('should return the auto-follow pattern stats', async () => {
        const { body } = await getAutoFollowStats().expect(200);

        expect(Object.keys(body)).to.eql([
          'numberOfFailedFollowIndices',
          'numberOfFailedRemoteClusterStateRequests',
          'numberOfSuccessfulFollowIndices',
          'recentAutoFollowErrors',
          'autoFollowedClusters'
        ]);
      });
    });

    describe('permissions', () => {
      it('should return the user permissions', async () => {
        const { body } = await getPermissions().expect(200);

        expect(body.hasPermission).to.not.be(undefined);
      });
    });
  });
}
