/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from './random';

/**
 * Helpers to create and delete indices on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const initElasticsearchHelpers = (getService) => {
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  let indicesCreated = [];
  let templatesCreated = [];
  let composableTemplatesCreated = [];
  let dataStreamsCreated = [];

  // Indices
  const getIndex = (index) => es.indices.get({ index });

  const createIndex = (index = getRandomString()) => {
    indicesCreated.push(index);
    return es.indices.create({ index }).then(() => index);
  };

  const deleteAllIndices = async () => {
    await esDeleteAllIndices(indicesCreated);
    indicesCreated = [];
  };

  // Data streams
  const createDataStream = (dataStream = getRandomString(), document) => {
    dataStreamsCreated.push(dataStream);
    return es.index({ index: dataStream, body: document }, { meta: true });
  };

  const deleteDataStream = (dataStream) => {
    dataStreamsCreated = dataStreamsCreated.filter((i) => i !== dataStream);
    return es.indices.deleteDataStream({ name: dataStream }, { meta: true });
  };

  const deleteAllDataStreams = () =>
    Promise.all(dataStreamsCreated.map(deleteDataStream)).then(() => (dataStreamsCreated = []));

  // Index templates
  const getIndexTemplates = () => es.indices.getTemplate(undefined, { meta: true });

  // Create index template if it does not already exist
  const createIndexTemplate = (name, template) => {
    templatesCreated.push(name);
    return es.indices.putTemplate({ name, body: template }, { create: true, meta: true });
  };

  const createComposableIndexTemplate = (name, template) => {
    composableTemplatesCreated.push(name);
    return es.indices.putIndexTemplate({ name, body: template }, { create: true, meta: true });
  };

  const deleteIndexTemplate = (name) => {
    templatesCreated = templatesCreated.filter((i) => i !== name);
    return es.indices.deleteTemplate({ name }, { meta: true }).catch((err) => {
      // Silently fail templates not found
      if (err.statusCode !== 404) {
        throw err;
      }
    });
  };

  const deleteComposableIndexTemplate = (name) => {
    composableTemplatesCreated = composableTemplatesCreated.filter((i) => i !== name);
    return es.indices.deleteIndexTemplate({ name }, { meta: true }).catch((err) => {
      // Silently fail if templates not found
      if (err.statusCode !== 404) {
        throw err;
      }
    });
  };

  const deleteAllTemplates = () =>
    Promise.all(templatesCreated.map(deleteIndexTemplate)).then(() => (templatesCreated = []));

  const deleteAllComposableTemplates = () =>
    Promise.all(templatesCreated.map(deleteComposableIndexTemplate)).then(
      () => (composableTemplatesCreated = [])
    );

  const cleanUp = () =>
    Promise.all([
      deleteAllIndices(),
      deleteAllTemplates(),
      deleteAllComposableTemplates(),
      deleteAllDataStreams(),
    ]);

  const getNodesStats = () => es.nodes.stats();

  return {
    getIndex,
    createIndex,
    createDataStream,
    deleteAllIndices,
    deleteAllTemplates,
    getIndexTemplates,
    createIndexTemplate,
    deleteIndexTemplate,
    createComposableIndexTemplate,
    getNodesStats,
    cleanUp,
  };
};
