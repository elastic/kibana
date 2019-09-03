/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';
import { getRandomString } from './lib';
import { getFollowerIndexPayload } from './fixtures';

export const registerHelpers = (supertest) => {
  let followerIndicesCreated = [];

  const loadFollowerIndices = () => supertest.get(`${API_BASE_PATH}/follower_indices`);

  const getFollowerIndex = (name) => supertest.get(`${API_BASE_PATH}/follower_indices/${name}`);

  const createFollowerIndex = (name = getRandomString(), payload = getFollowerIndexPayload()) => {
    followerIndicesCreated.push(name);

    return supertest
      .post(`${API_BASE_PATH}/follower_indices`)
      .set('kbn-xsrf', 'xxx')
      .send({ ...payload, name });
  };

  const unfollowLeaderIndex = (followerIndex) => {
    const followerIndices = Array.isArray(followerIndex) ? followerIndex : [followerIndex];
    const followerIndicesToEncodedString = followerIndices.map(index => encodeURIComponent(index)).join(',');

    return supertest
      .put(`${API_BASE_PATH}/follower_indices/${followerIndicesToEncodedString}/unfollow`)
      .set('kbn-xsrf', 'xxx');
  };

  const unfollowAll = (indices = followerIndicesCreated) => (
    unfollowLeaderIndex(indices)
      .then(loadFollowerIndices)
      .then(({ body }) => {
        if (body.indices.length) {
          // There are still some index left to delete. Call recursively
          // until all follower indices are removed.
          return unfollowAll(body.indices.map(i => i.name));
        }
        followerIndicesCreated = [];
      })
  );

  return {
    loadFollowerIndices,
    getFollowerIndex,
    createFollowerIndex,
    unfollowAll,
  };
};
