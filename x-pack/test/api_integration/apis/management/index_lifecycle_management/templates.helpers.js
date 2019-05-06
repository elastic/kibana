/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }) => {
  const loadTemplates = () => supertest.get(`${API_BASE_PATH}/templates`);

  const getTemplate = (name) => supertest.get(`${API_BASE_PATH}/templates/${name}`);

  const addPolicyToTemplate = (templateName, policyName, aliasName) => (
    supertest.post(`${API_BASE_PATH}/template`)
      .set('kbn-xsrf', 'xxx')
      .send({
        templateName,
        policyName,
        aliasName
      })
  );

  // const deletePolicy = (name) => {
  //   return supertest
  //     .delete(`${API_BASE_PATH}/policies/${name}`)
  //     .set('kbn-xsrf', 'xxx');
  // };

  // const deleteAllPolicies = (policies) => (
  //   Promise.all(policies.map(deletePolicy))
  // );

  const cleanUp = () => {
    // return loadTemplates()
    //   .then(({ body }) => getPolicyNames(body).filter(name => name !== DEFAULT_POLICY_NAME))
    //   .then(deleteAllPolicies);
  };

  return {
    cleanUp,
    loadTemplates,
    getTemplate,
    addPolicyToTemplate,
    // deletePolicy,
  };
};
