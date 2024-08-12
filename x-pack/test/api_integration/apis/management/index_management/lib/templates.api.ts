/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TemplateDeserialized, TemplateSerialized } from '@kbn/index-management-plugin/common';
import { API_BASE_PATH } from '../constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function templatesApi(getService: FtrProviderContext['getService']) {
  const supertest = getService('supertest');
  let templatesCreated: Array<{ name: string; isLegacy?: boolean }> = [];

  const getAllTemplates = () => supertest.get(`${API_BASE_PATH}/index_templates`);

  const getOneTemplate = (name: string, isLegacy: boolean = false) =>
    supertest.get(`${API_BASE_PATH}/index_templates/${name}?legacy=${isLegacy}`);

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
  const cleanUpTemplates = async (
    additionalRequestHeaders: Record<string, string | string[]> = {}
  ) => {
    try {
      await deleteTemplates(templatesCreated).set(additionalRequestHeaders);
      templatesCreated = [];
    } catch (e) {
      // Silently swallow errors
    }
  };

  const simulateTemplate = (payload: TemplateSerialized) =>
    supertest
      .post(`${API_BASE_PATH}/index_templates/simulate`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);

  return {
    getAllTemplates,
    getOneTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplates,
    cleanUpTemplates,
    simulateTemplate,
  };
}
