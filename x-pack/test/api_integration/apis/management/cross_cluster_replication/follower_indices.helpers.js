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

  const getFollowerIndex = (name, waitUntilIsActive = false) => {
    const maxRetries = 10;
    const delayBetweenRetries = 500;
    let retryCount = 0;

    const proceed = async () => {
      const response = await supertest.get(`${API_BASE_PATH}/follower_indices/${name}`);

      if (waitUntilIsActive && response.body.status !== 'active') {
        retryCount += 1;

        if (retryCount > maxRetries) {
          throw new Error('Error waiting for follower index to be active.');
        }

        return new Promise((resolve) => setTimeout(resolve, delayBetweenRetries)).then(proceed);
      }

      return response;
    };

    return {
      expect: (status) =>
        new Promise((resolve, reject) =>
          proceed()
            .then((response) => {
              if (status !== response.status) {
                reject(new Error(`Expected status ${status} but got ${response.status}`));
              }
              return resolve(response);
            })
            .catch(reject)
        ),
      then: (resolve, reject) => proceed().then(resolve).catch(reject),
    };
  };

  const createFollowerIndex = (name = getRandomString(), payload = getFollowerIndexPayload()) => {
    followerIndicesCreated.push(name);

    return supertest
      .post(`${API_BASE_PATH}/follower_indices`)
      .set('kbn-xsrf', 'xxx')
      .send({ ...payload, name });
  };

  const updateFollowerIndex = (name, payload) => {
    return supertest
      .put(`${API_BASE_PATH}/follower_indices/${name}`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);
  };

  const unfollowLeaderIndex = (followerIndex) => {
    const followerIndices = Array.isArray(followerIndex) ? followerIndex : [followerIndex];
    const followerIndicesToEncodedString = followerIndices
      .map((index) => encodeURIComponent(index))
      .join(',');

    return supertest
      .put(`${API_BASE_PATH}/follower_indices/${followerIndicesToEncodedString}/unfollow`)
      .set('kbn-xsrf', 'xxx');
  };

  const unfollowAll = (indices = followerIndicesCreated) =>
    unfollowLeaderIndex(indices)
      .then(loadFollowerIndices)
      .then(({ body }) => {
        if (body.indices.length) {
          // There are still some index left to delete. Call recursively
          // until all follower indices are removed.
          return unfollowAll(body.indices.map((i) => i.name));
        }
        followerIndicesCreated = [];
      });

  return {
    loadFollowerIndices,
    getFollowerIndex,
    createFollowerIndex,
    updateFollowerIndex,
    unfollowAll,
  };
};
