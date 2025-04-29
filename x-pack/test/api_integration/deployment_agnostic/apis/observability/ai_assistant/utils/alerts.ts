/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export const createRule = async ({
  getService,
  roleAuthc,
  internalReqHeader,
  data,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  data: any;
}) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const logger = getService('log');

  try {
    const response = await supertestWithoutAuth
      .post('/api/alerting/rule')
      .set(roleAuthc.apiKeyHeader)
      .set(internalReqHeader)
      .set('kbn-xsrf', 'foo')
      .send(data)
      .expect(200);

    const ruleId = response.body.id as string;
    return ruleId;
  } catch (e) {
    logger.error(`Failed to create alerting rule: ${e}`);
    throw e;
  }
};

export const runRule = async ({
  getService,
  roleAuthc,
  internalReqHeader,
  ruleId,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  ruleId: string;
}) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const response = await supertestWithoutAuth
    .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
    .set(roleAuthc.apiKeyHeader)
    .set(internalReqHeader)
    .expect(204);

  return response;
};

const deleteRuleById = async ({
  getService,
  roleAuthc,
  internalReqHeader,
  ruleId,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  ruleId: string;
}) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return supertestWithoutAuth
    .delete(`/api/alerting/rule/${ruleId}`)
    .set(roleAuthc.apiKeyHeader)
    .set(internalReqHeader);
};

export const deleteRules = async ({
  getService,
  roleAuthc,
  internalReqHeader,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
}) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const response = await supertestWithoutAuth
    .get('/api/alerting/rules/_find')
    .set(roleAuthc.apiKeyHeader)
    .set(internalReqHeader);

  return Promise.all(
    response.body.data.map((rule: any) =>
      deleteRuleById({ getService, roleAuthc, internalReqHeader, ruleId: rule.id })
    )
  );
};
