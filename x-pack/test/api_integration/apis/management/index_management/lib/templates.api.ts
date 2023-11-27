/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TemplateDeserialized } from '@kbn/index-management-plugin/common';
import { API_BASE_PATH, INDEX_PATTERNS } from '../constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function templatesApi(getService: FtrProviderContext['getService']) {
  const supertest = getService('supertest');
  let templatesCreated: Array<{ name: string; isLegacy?: boolean }> = [];

  const getAllTemplates = () => supertest.get(`${API_BASE_PATH}/index_templates`);

  const getOneTemplate = (name: string, isLegacy: boolean = false) =>
    supertest.get(`${API_BASE_PATH}/index_templates/${name}?legacy=${isLegacy}`);

  const getTemplatePayload = (
    name: string,
    indexPatterns: string[] = INDEX_PATTERNS,
    isLegacy: boolean = false
  ) => {
    const baseTemplate: TemplateDeserialized = {
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
        type: 'default',
        hasDatastream: false,
      },
    };

    if (isLegacy) {
      baseTemplate.order = 1;
    } else {
      baseTemplate.priority = 1;
    }

    return baseTemplate;
  };

  const createTemplate = (template: TemplateDeserialized) => {
    templatesCreated.push({ name: template.name, isLegacy: template._kbnMeta.isLegacy });
    return supertest.post(`${API_BASE_PATH}/index_templates`).set('kbn-xsrf', 'xxx').send(template);
  };

  const deleteTemplates = (templates: Array<{ name: string; isLegacy?: boolean }>) =>
    supertest
      .post(`${API_BASE_PATH}/delete_index_templates`)
      .set('kbn-xsrf', 'xxx')
      .send({ templates });

  const updateTemplate = (payload: TemplateDeserialized, templateName: string) =>
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
}
