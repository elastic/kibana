/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH, INDEX_PATTERNS } from './constants';

export const registerHelpers = ({ supertest }) => {
  const list = () => supertest.get(`${API_BASE_PATH}/templates`);

  const getTemplatePayload = name => ({
    name,
    order: 1,
    indexPatterns: INDEX_PATTERNS,
    version: 1,
    settings: {
      number_of_shards: 1
    },
    mappings: {
      _source: {
        enabled: false
      },
      properties: {
        host_name: {
          type: 'keyword'
        },
        created_at: {
          type: 'date',
          format: 'EEE MMM dd HH:mm:ss Z yyyy'
        }
      }
    },
    aliases: {
      alias1: {}
    }
  });

  const createTemplate = payload =>
    supertest
      .put(`${API_BASE_PATH}/templates`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);

  const deleteTemplates = templatesToDelete =>
    supertest
      .delete(`${API_BASE_PATH}/templates/${templatesToDelete.map(template => encodeURIComponent(template)).join(',')}`)
      .set('kbn-xsrf', 'xxx');

  return {
    list,
    getTemplatePayload,
    createTemplate,
    deleteTemplates,
  };
};
