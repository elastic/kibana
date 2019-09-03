/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }) => {
  const getIndexSettings = (indexName) => supertest.get(`${API_BASE_PATH}/settings/${indexName}`);

  const updateIndexSettings = (indexName, settings) => (
    supertest.put(`${API_BASE_PATH}/settings/${indexName}`)
      .set('kbn-xsrf', 'xxx')
      .send(settings)
  );

  return {
    getIndexSettings,
    updateIndexSettings,
  };
};
