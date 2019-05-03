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
  // Indices
  let indicesCreated = [];

  const createIndex = (index = getRandomString()) => {
    indicesCreated.push(index);
    return es.indices.create({ index }).then(() => index);
  };

  const deleteIndex = (index) => {
    indicesCreated = indicesCreated.filter(i => i !== index);
    return es.indices.delete({ index });
  };

  const deleteAllIndices = () => (
    Promise.all(indicesCreated.map(deleteIndex)).then(() => indicesCreated = [])
  );

  // Index templates
  const getIndexTemplates = () => (
    es.indices.getTemplate()
  );

  const createIndexTemplate = (name, template) => (
    es.indices.putTemplate({ name, body: template }, { create: true })
  );

  const deleteIndexTemplate = (name) => (
    es.indices.deleteTemplate({ name })
  );

  return ({
    createIndex,
    deleteIndex,
    deleteAllIndices,
    getIndexTemplates,
    createIndexTemplate,
    deleteIndexTemplate,
  });
};
