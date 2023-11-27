/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helpers to create and delete indices on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const initElasticsearchHelpers = (getService) => {
  const es = getService('es');

  let datastreamCreated = [];
  let indexTemplatesCreated = [];
  let componentTemplatesCreated = [];

  const createDatastream = (datastream) => {
    datastreamCreated.push(datastream);
    return es.indices.createDataStream({ name: datastream });
  };

  const deleteDatastream = (datastream) => {
    return es.indices.deleteDataStream({ name: datastream });
  };

  const cleanupDatastreams = () =>
    Promise.all(datastreamCreated.map(deleteDatastream))
      .then(() => {
        datastreamCreated = [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  const catTemplate = (name) => es.cat.templates({ name, format: 'json' }, { meta: true });

  const createIndexTemplate = (indexTemplate, shouldCacheTemplate) => {
    if (shouldCacheTemplate) {
      indexTemplatesCreated.push(indexTemplate.name);
    }

    return es.indices.putIndexTemplate(indexTemplate, { meta: true });
  };

  const deleteIndexTemplate = (indexTemplateName) => {
    return es.indices.deleteIndexTemplate({ name: indexTemplateName }, { meta: true });
  };

  const createComponentTemplate = (componentTemplate, shouldCacheTemplate) => {
    if (shouldCacheTemplate) {
      componentTemplatesCreated.push(componentTemplate.name);
    }

    return es.cluster.putComponentTemplate(componentTemplate, { meta: true });
  };

  const deleteComponentTemplate = (componentTemplateName) => {
    return es.cluster.deleteComponentTemplate({ name: componentTemplateName }, { meta: true });
  };

  const cleanUpComponentTemplates = () =>
    Promise.all(componentTemplatesCreated.map(deleteComponentTemplate))
      .then(() => {
        componentTemplatesCreated = [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  const cleanUpIndexTemplates = () =>
    Promise.all(indexTemplatesCreated.map(deleteIndexTemplate))
      .then(() => {
        indexTemplatesCreated = [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  return {
    createDatastream,
    deleteDatastream,
    cleanupDatastreams,
    catTemplate,
    createIndexTemplate,
    deleteIndexTemplate,
    cleanUpIndexTemplates,
    createComponentTemplate,
    deleteComponentTemplate,
    cleanUpComponentTemplates,
  };
};
