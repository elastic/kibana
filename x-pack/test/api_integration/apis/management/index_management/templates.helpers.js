/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH, INDEX_PATTERNS } from './constants';

export const registerHelpers = ({ supertest }) => {
  let templatesCreated = [];

  const getAllTemplates = () => supertest.get(`${API_BASE_PATH}/index_templates`);

  const getOneTemplate = (name, isLegacy = false) =>
    supertest.get(`${API_BASE_PATH}/index_templates/${name}?legacy=${isLegacy}`);

  const getTemplatePayload = (
    name,
    indexPatterns = INDEX_PATTERNS,
    isLegacy = false,
    type = 'default'
  ) => {
    const baseTemplate = {
      name,
      indexPatterns,
      version: 1,
      template: {
        settings: {
          number_of_shards: 1,
          index: {
            lifecycle: {
              name: 'my_policy',
            },
          },
        },
        mappings: {
          _source: {
            enabled: false,
          },
          properties: {
            host_name: {
              type: 'keyword',
            },
            created_at: {
              type: 'date',
              format: 'EEE MMM dd HH:mm:ss Z yyyy',
            },
          },
        },
        aliases: {
          alias1: {},
        },
      },
      _kbnMeta: {
        isLegacy,
        type,
      },
    };

    if (isLegacy) {
      baseTemplate.order = 1;
    } else {
      baseTemplate.priority = 1;
    }

    return baseTemplate;
  };

  const createTemplate = (template) => {
    templatesCreated.push({ name: template.name, isLegacy: template._kbnMeta.isLegacy });
    return supertest.post(`${API_BASE_PATH}/index_templates`).set('kbn-xsrf', 'xxx').send(template);
  };

  const deleteTemplates = (templates) =>
    supertest
      .post(`${API_BASE_PATH}/delete_index_templates`)
      .set('kbn-xsrf', 'xxx')
      .send({ templates });

  const updateTemplate = (payload, templateName) =>
    supertest
      .put(`${API_BASE_PATH}/index_templates/${templateName}`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);

  // Delete all templates created during tests
  const cleanUpTemplates = async () => {
    try {
      await deleteTemplates(templatesCreated);
      templatesCreated = [];
    } catch (e) {
      // Silently swallow errors
    }
  };

  return {
    getAllTemplates,
    getOneTemplate,
    getTemplatePayload,
    createTemplate,
    updateTemplate,
    deleteTemplates,
    cleanUpTemplates,
  };
};
