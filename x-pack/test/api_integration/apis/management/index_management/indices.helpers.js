/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }) => {
  const executeActionOnIndices = (index, urlParam, args) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest
      .post(`${API_BASE_PATH}/indices/${urlParam}`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices, ...args });
  };

  const closeIndex = (index) => executeActionOnIndices(index, 'close');

  const openIndex = (index) => executeActionOnIndices(index, 'open');

  const deleteIndex = (index) => executeActionOnIndices(index, 'delete');

  const flushIndex = (index) => executeActionOnIndices(index, 'flush');

  const refreshIndex = (index) => executeActionOnIndices(index, 'refresh');

  const forceMerge = (index, args) => executeActionOnIndices(index, 'forcemerge', args);

  const freeze = (index) => executeActionOnIndices(index, 'freeze');

  const unfreeze = (index) => executeActionOnIndices(index, 'unfreeze');

  const clearCache = (index) => executeActionOnIndices(index, 'clear_cache');

  const list = () => supertest.get(`${API_BASE_PATH}/indices`);

  const reload = (indexNames) =>
    supertest.post(`${API_BASE_PATH}/indices/reload`).set('kbn-xsrf', 'xxx').send({ indexNames });

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
