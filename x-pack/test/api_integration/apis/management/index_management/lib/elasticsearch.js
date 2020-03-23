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
export const initElasticsearchHelpers = es => {
  let indicesCreated = [];

  const createIndex = (index = getRandomString(), body) => {
    indicesCreated.push(index);
    return es.indices.create({ index, body }).then(() => index);
  };

  const deleteIndex = index => {
    indicesCreated = indicesCreated.filter(i => i !== index);
    return es.indices.delete({ index, ignoreUnavailable: true });
  };

  const deleteAllIndices = () =>
    Promise.all(indicesCreated.map(deleteIndex)).then(() => (indicesCreated = []));

  const catIndex = (index, h) => es.cat.indices({ index, format: 'json', h });

  const indexStats = (index, metric) => es.indices.stats({ index, metric });

  const cleanUp = () => deleteAllIndices();

  const catTemplate = name => es.cat.templates({ name, format: 'json' });

  return {
    createIndex,
    deleteIndex,
    deleteAllIndices,
    catIndex,
    indexStats,
    cleanUp,
    catTemplate,
  };
};
