/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH, DEFAULT_POLICY_NAME } from './constants';
import { getPolicyNames } from './lib';

export const registerHelpers = ({ es, supertest }) => {
  const loadPolicies = (withIndices = false) =>
    withIndices
      ? supertest.get(`${API_BASE_PATH}/policies?withIndices=true`)
      : supertest.get(`${API_BASE_PATH}/policies`);

  const createPolicy = (policy) => {
    return supertest.post(`${API_BASE_PATH}/policies`).set('kbn-xsrf', 'xxx').send(policy);
  };

  const deletePolicy = (name) => {
    return supertest.delete(`${API_BASE_PATH}/policies/${name}`).set('kbn-xsrf', 'xxx');
  };

  const deleteAllPolicies = (policies) => Promise.all(policies.map(deletePolicy));

  const cleanUp = () => {
    return loadPolicies()
      .then(({ body }) => getPolicyNames(body).filter((name) => name !== DEFAULT_POLICY_NAME))
      .then(deleteAllPolicies);
  };

  const createRepository = (repoName, repoPath) => {
    return es.snapshot.createRepository({
      name: repoName,
      body: {
        type: 'fs',
        settings: {
          location: repoPath ?? '/tmp/repo',
        },
      },
      verify: false,
    });
  };

  const deleteRepository = (repository) => {
    return es.snapshot.deleteRepository({ name: [repository] });
  };

  const createSLMPolicy = (policy) => {
    return es.slm.putLifecycle({
      policy_id: policy.policyName,
      body: policy,
    });
  };

  const deleteSLMPolicy = (policyName) => es.slm.deleteLifecycle({ policy_id: policyName });

  return {
    cleanUp,
    loadPolicies,
    createPolicy,
    deletePolicy,
    createRepository,
    deleteRepository,
    createSLMPolicy,
    deleteSLMPolicy,
  };
};
