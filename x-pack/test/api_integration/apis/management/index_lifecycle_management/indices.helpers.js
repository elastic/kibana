/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH, INDEX_TEMPLATE_NAME } from './constants';
import { initElasticsearchIndicesHelpers } from './lib';

export const registerHelpers = ({ supertest, es }) => {
  const { deleteIndexTemplate, deleteAllIndices } = initElasticsearchIndicesHelpers(es);

  const getIndicesAffectedByTemplate = (template) => (
    supertest.get(`${API_BASE_PATH}/indices/affected/${template}`)
  );

  const addPolicyToIndex = (policyName, indexName, rolloverAlias) => {
    return supertest
      .post(`${API_BASE_PATH}/index/add`)
      .set('kbn-xsrf', 'xxx')
      .send({
        indexName,
        policyName,
        alias: rolloverAlias,
      });
  };

  const cleanUp = () => {
    return deleteIndexTemplate(INDEX_TEMPLATE_NAME)
      .then(deleteAllIndices);
  };

  return {
    cleanUp,
    getIndicesAffectedByTemplate,
    addPolicyToIndex,
  };
};
