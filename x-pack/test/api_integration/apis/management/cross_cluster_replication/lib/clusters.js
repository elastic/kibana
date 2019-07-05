/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRandomString } from './random';
import { REMOTE_CLUSTERS_API_BASE_PATH } from '../constants';

const CLUSTER_NAME = `test-${getRandomString()}`;

/**
 * Helpers for the CCR application to easily create and delete
 * Remote clusters for the tests.
 * @param {Supertest} supertest The supertest instance
 */
export const initClusterHelpers = (supertest) => {
  let clusters = [];

  const addCluster = (name = CLUSTER_NAME) => {
    clusters.push(name);
    return (
      supertest
        .post(`${REMOTE_CLUSTERS_API_BASE_PATH}`)
        .set('kbn-xsrf', 'xxx')
        .send({
          "name": name,
          "seeds": [
            "localhost:9300"
          ],
          "skipUnavailable": true,
        })
    );
  };

  const deleteCluster = (name = CLUSTER_NAME) => {
    clusters = clusters.filter(c => c !== name);
    return (
      supertest
        .delete(`${REMOTE_CLUSTERS_API_BASE_PATH}/${name}`)
        .set('kbn-xsrf', 'xxx')
    );
  };

  const deleteAllClusters = () => (
    Promise.all(clusters.map(deleteCluster)).then(() => {
      clusters = [];
    })
  );

  return ({
    CLUSTER_NAME,
    addCluster,
    deleteCluster,
    deleteAllClusters,
  });
};
