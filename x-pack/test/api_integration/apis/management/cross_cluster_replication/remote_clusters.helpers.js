/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { REMOTE_CLUSTER_NAME, REMOTE_CLUSTERS_API_BASE_PATH } from './constants';

/**
 * Helpers for the CCR application to easily create and delete
 * Remote clusters for the tests.
 * @param {Supertest} supertest The supertest instance
 */
export const registerHelpers = (supertest) => {
  let remoteClustersCreated = [];

  const addCluster = (name = REMOTE_CLUSTER_NAME) => {
    remoteClustersCreated.push(name);

    return supertest
      .post(`${REMOTE_CLUSTERS_API_BASE_PATH}`)
      .set('kbn-xsrf', 'xxx')
      .send({
        'name': name,
        'seeds': [
          'localhost:9300'
        ],
        'skipUnavailable': true,
      });
  };

  const deleteCluster = (name = REMOTE_CLUSTER_NAME) => {
    remoteClustersCreated = remoteClustersCreated.filter(c => c !== name);

    return supertest
      .delete(`${REMOTE_CLUSTERS_API_BASE_PATH}/${name}`)
      .set('kbn-xsrf', 'xxx');
  };

  const deleteAllClusters = () => (
    Promise.all(remoteClustersCreated.map(deleteCluster)).then(() => {
      remoteClustersCreated = [];
    })
  );

  return ({
    addCluster,
    deleteCluster,
    deleteAllClusters,
  });
};
