/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';
import { getRandomString } from './lib';

export const registerHelpers = ({ supertest }) => {
  const addPolicyToIndex = (policyName, indexName, rolloverAlias = getRandomString()) =>
    supertest.post(`${API_BASE_PATH}/index/add`).set('kbn-xsrf', 'xxx').send({
      indexName,
      policyName,
      alias: rolloverAlias,
    });

  const removePolicyFromIndex = (indexName) => {
    const indexNames = Array.isArray(indexName) ? indexName : [indexName];
    return supertest.post(`${API_BASE_PATH}/index/remove`).set('kbn-xsrf', 'xxx').send({
      indexNames,
    });
  };

  const retryPolicyOnIndex = (indexName) => {
    const indexNames = Array.isArray(indexName) ? indexName : [indexName];
    return supertest.post(`${API_BASE_PATH}/index/retry`).set('kbn-xsrf', 'xxx').send({
      indexNames,
    });
  };

  return {
    addPolicyToIndex,
    removePolicyFromIndex,
    retryPolicyOnIndex,
  };
};
