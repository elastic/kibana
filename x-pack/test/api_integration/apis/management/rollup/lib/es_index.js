/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRandomString } from './random';

/**
 * Helpers to create and delete indices on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const initElasticsearchIndicesHelpers = (es) => {
  let indicesCreated = [];

  const createIndex = (index = getRandomString(), body = {}) => {
    indicesCreated.push(index);

    return es.indices.create({
      index,
      body,
    }).then(() => index);
  };

  const deleteIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];
    indices.forEach((_index) => {
      indicesCreated = indicesCreated.filter(i => i !== _index);
    });
    return es.indices.delete({ index: indices })
      .catch((err) => {
        // silently fail if an index could not be deleted (unless we got a 404 which means the index has already been deleted)
        if (err && err.statusCode !== 404) {
          throw err;
        }
      });
  };

  const deleteAllIndices = () => (
    deleteIndex(indicesCreated).then(() => indicesCreated = [])
  );

  return ({
    createIndex,
    deleteIndex,
    deleteAllIndices,
  });
};
