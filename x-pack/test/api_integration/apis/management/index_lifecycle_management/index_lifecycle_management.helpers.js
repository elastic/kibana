/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';
import { gePolicyPayload } from './fixtures';

export const registerHelpers = ({ supertest }) => {
  let policiesCreated = [];

  const cleanUp = () => {
    policiesCreated.forEach((policy) => {
      console.log('Will have to delete policy', policy);
    });
    policiesCreated = [];
  };

  const loadPolicies = () => supertest.get(`${API_BASE_PATH}/policies`);

  const createPolicy = (policy = gePolicyPayload()) => {
    policiesCreated.push(policy);

    return supertest
      .post(`${API_BASE_PATH}/lifecycle`)
      .set('kbn-xsrf', 'xxx')
      .send(policy);
  };

  return {
    cleanUp,
    loadPolicies,
    createPolicy,
  };
};
