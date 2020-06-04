/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH, INDEX_PATTERNS } from './constants';

export const registerHelpers = ({ supertest }) => {
  const getAllTemplates = () => supertest.get(`${API_BASE_PATH}/templates`);

  const getOneTemplate = (name, formatVersion = 1) =>
    supertest.get(`${API_BASE_PATH}/templates/${name}?v=${formatVersion}`);

  const getTemplatePayload = (name, formatVersion = 1) => ({
    name,
    order: 1,
    indexPatterns: INDEX_PATTERNS,
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
      formatVersion,
    },
  });

  const createTemplate = (payload) =>
    supertest.put(`${API_BASE_PATH}/templates`).set('kbn-xsrf', 'xxx').send(payload);

  const deleteTemplates = (templates) =>
    supertest.post(`${API_BASE_PATH}/delete-templates`).set('kbn-xsrf', 'xxx').send({ templates });

  const updateTemplate = (payload, templateName) =>
    supertest
      .put(`${API_BASE_PATH}/templates/${templateName}`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);

  return {
    getAllTemplates,
    getOneTemplate,
    getTemplatePayload,
    createTemplate,
    updateTemplate,
    deleteTemplates,
  };
};
