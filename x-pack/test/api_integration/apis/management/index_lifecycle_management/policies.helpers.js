/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH, DEFAULT_POLICY_NAME } from './constants';
import { getPolicyPayload } from './fixtures';
import { getPolicyNames } from './lib';

export const registerHelpers = ({ supertest }) => {
  const loadPolicies = (withIndices = false) => withIndices
    ? supertest.get(`${API_BASE_PATH}/policies?withIndices=true`)
    : supertest.get(`${API_BASE_PATH}/policies`);

  const createPolicy = (policy = getPolicyPayload()) => {
    return supertest
      .post(`${API_BASE_PATH}/policies`)
      .set('kbn-xsrf', 'xxx')
      .send(policy);
  };

  const deletePolicy = (name) => {
    return supertest
      .delete(`${API_BASE_PATH}/policies/${name}`)
      .set('kbn-xsrf', 'xxx');
  };

  const deleteAllPolicies = (policies) => (
    Promise.all(policies.map(deletePolicy))
  );

  const cleanUp = () => {
    return loadPolicies()
      .then(({ body }) => getPolicyNames(body).filter(name => name !== DEFAULT_POLICY_NAME))
      .then(deleteAllPolicies);
  };

  return {
    cleanUp,
    loadPolicies,
    createPolicy,
    deletePolicy,
  };
};
