/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_BASE_PATH } from './constants';
import { RoleCredentials } from '../../../shared/services';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SvlEnrichPoliciesApi({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');

  const getAllEnrichPolicies = async (roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .get(`${INTERNAL_API_BASE_PATH}/enrich_policies`)
      .set(svlUserManager.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const executeEnrichPolicy = async (name: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .put(`${INTERNAL_API_BASE_PATH}/enrich_policies/${name}`)
      .set(svlUserManager.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const removeEnrichPolicy = async (name: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .delete(`${INTERNAL_API_BASE_PATH}/enrich_policies/${name}`)
      .set(svlUserManager.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  return {
    getAllEnrichPolicies,
    removeEnrichPolicy,
    executeEnrichPolicy,
  };
}
