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
  let templatesCreated = [];

  // Indices
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

  // Create index template if it does not already exist
  const createIndexTemplate = (name, template) => {
    templatesCreated.push(name);
    return es.indices.putTemplate({ name, body: template }, { create: true });
  };

  const deleteIndexTemplate = (name) => {
    templatesCreated = templatesCreated.filter(i => i !== name);
    return es.indices.deleteTemplate({ name });
  };

  const deleteAllTemplates = () => (
    Promise.all(templatesCreated.map(deleteIndexTemplate)).then(() => templatesCreated = [])
  );

  const cleanUp = () => (
    Promise.all([deleteAllIndices(), deleteAllTemplates()])
  );

  return ({
    createIndex,
    deleteIndex,
    deleteAllIndices,
    deleteAllTemplates,
    getIndexTemplates,
    createIndexTemplate,
    deleteIndexTemplate,
    cleanUp,
  });
};
