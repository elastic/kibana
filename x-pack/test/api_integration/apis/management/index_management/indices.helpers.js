/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }) => {
  const closeIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/close`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const openIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/open`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const deleteIndex = (indices) => {
    return supertest.post(`${API_BASE_PATH}/indices/delete`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const flushIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/flush`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const refreshIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/refresh`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  // eslint-disable-next-line camelcase
  const forceMerge = ({ index, max_num_segments }) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/forcemerge`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices, max_num_segments });
  };

  const freeze = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/freeze`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const unfreeze = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/unfreeze`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const list = () => supertest.get(`${API_BASE_PATH}/indices`);

  const reload = (indexNames) => (
    supertest.post(`${API_BASE_PATH}/indices/reload`)
      .set('kbn-xsrf', 'xxx')
      .send({ indexNames })
  );

  const clearCache = (indices) => (
    supertest.post(`${API_BASE_PATH}/indices/clear_cache`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices })
  );

  return {
    closeIndex,
    openIndex,
    deleteIndex,
    flushIndex,
    refreshIndex,
    forceMerge,
    freeze,
    unfreeze,
    list,
    reload,
    clearCache,
  };
};
