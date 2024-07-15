/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TemplateDeserialized, TemplateSerialized } from '@kbn/index-management-plugin/common';
import { API_BASE_PATH } from './constants';
import { InternalRequestHeader, RoleCredentials } from '../../../shared/services';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SvlTemplatesApi({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  let templatesCreated: Array<{ name: string; isLegacy?: boolean }> = [];

  const getAllTemplates = (internalReqHeader: InternalRequestHeader, roleAuthc: RoleCredentials) =>
    supertestWithoutAuth.get(`${API_BASE_PATH}/index_templates`).set(roleAuthc.apiKeyHeader);

  const getOneTemplate = (name: string, isLegacy: boolean = false) =>
    supertestWithoutAuth.get(`${API_BASE_PATH}/index_templates/${name}?legacy=${isLegacy}`);

  const createTemplate = (template: TemplateDeserialized, roleAuthc: RoleCredentials) => {
    templatesCreated.push({ name: template.name, isLegacy: template._kbnMeta.isLegacy });
    return supertestWithoutAuth
      .post(`${API_BASE_PATH}/index_templates`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(template);
  };

  const deleteTemplates = async (
    templates: Array<{ name: string; isLegacy?: boolean }>,
    roleAuthc: RoleCredentials
  ) =>
    await supertestWithoutAuth
      .post(`${API_BASE_PATH}/delete_index_templates`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send({ templates });

  const updateTemplate = async (
    payload: TemplateDeserialized,
    templateName: string,
    roleAuthc: RoleCredentials
  ) =>
    await supertestWithoutAuth
      .put(`${API_BASE_PATH}/index_templates/${templateName}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(payload);

  // Delete all templates created during tests
  const cleanUpTemplates = async (roleAuthc: RoleCredentials) => {
    try {
      await deleteTemplates(templatesCreated, roleAuthc);
      templatesCreated = [];
    } catch (e) {
      // Silently swallow errors
    }
  };

  const simulateTemplate = async (payload: TemplateSerialized, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .post(`${API_BASE_PATH}/index_templates/simulate`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
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
