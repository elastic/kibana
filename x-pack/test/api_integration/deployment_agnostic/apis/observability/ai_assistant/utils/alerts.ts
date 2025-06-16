/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { APM_ALERTS_INDEX, ApmAlertFields } from '../../apm/alerts/helpers/alerting_helper';

export const createRule = async ({
  getService,
  roleAuthc,
  data,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  data?: any;
}) => {
  const alertingApi = getService('alertingApi');
  const logger = getService('log');

  try {
    const createdRule = await alertingApi.createRule({
      ruleTypeId: data?.ruleTypeId || ApmRuleType.TransactionErrorRate,
      name: data?.ruleName || 'APM transaction error rate',
      consumer: data?.consumer || 'apm',
      schedule: { interval: data?.interval || '1m' },
      tags: data?.tags || ['apm'],
      params: {
        environment: data?.environment || 'production',
        threshold: data?.threshold || 1,
        windowSize: data?.windowSize || 1,
        windowUnit: data?.windowUnit || 'h',
      },
      roleAuthc,
    });

    const ruleId = createdRule.id as string;

    await alertingApi.waitForDocumentInIndex<ApmAlertFields>({
      indexName: data?.indexName || APM_ALERTS_INDEX,
      ruleId,
      docCountTarget: data?.docCountTarget || 1,
    });

    return ruleId;
  } catch (e) {
    logger.error(`Failed to create alerting rule: ${e}`);
    throw e;
  }
};

export const runRule = async ({
  getService,
  roleAuthc,
  ruleId,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  ruleId: string;
}) => {
  const alertingApi = getService('alertingApi');
  return alertingApi.runRule(roleAuthc, ruleId);
};

export const deleteRules = async ({
  getService,
  roleAuthc,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
}) => {
  const alertingApi = getService('alertingApi');
  return alertingApi.deleteRules({ roleAuthc });
};
