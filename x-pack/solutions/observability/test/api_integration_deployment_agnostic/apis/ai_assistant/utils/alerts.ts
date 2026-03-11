/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type { ApmAlertFields } from '../../apm/alerts/helpers/alerting_helper';
import { APM_ALERTS_INDEX } from '../../apm/alerts/helpers/alerting_helper';

interface AlertRuleData {
  ruleTypeId?: string;
  ruleName?: string;
  consumer?: string;
  interval?: string;
  tags?: string[];
  environment?: string;
  threshold?: number;
  windowSize?: number;
  windowUnit?: string;
  indexName?: string;
  docCountTarget?: number;
}

interface AlertingApiService {
  createRule(params: {
    ruleTypeId: string;
    name: string;
    consumer: string;
    schedule: { interval: string };
    tags: string[];
    params: {
      environment: string;
      threshold: number;
      windowSize: number;
      windowUnit: string;
    };
    roleAuthc: RoleCredentials;
  }): Promise<{ id?: string }>;
  waitForDocumentInIndex<T>(params: {
    indexName: string;
    ruleId: string;
    docCountTarget: number;
  }): Promise<T | unknown>;
  runRule(roleAuthc: RoleCredentials, ruleId: string): Promise<unknown>;
  deleteRules(params: { roleAuthc: RoleCredentials }): Promise<unknown>;
}

interface LoggerService {
  error(message: string): void;
}

interface GetAlertingHelperService {
  (name: 'alertingApi'): AlertingApiService;
  (name: 'log'): LoggerService;
}

interface CreateRuleArgs {
  getService: GetAlertingHelperService;
  roleAuthc: RoleCredentials;
  internalReqHeader?: InternalRequestHeader;
  data?: AlertRuleData;
}

interface RunRuleArgs {
  getService: GetAlertingHelperService;
  roleAuthc: RoleCredentials;
  internalReqHeader?: InternalRequestHeader;
  ruleId: string;
}

interface DeleteRulesArgs {
  getService: GetAlertingHelperService;
  roleAuthc: RoleCredentials;
  internalReqHeader?: InternalRequestHeader;
}

export const createRule = async ({
  getService,
  roleAuthc,
  data,
}: CreateRuleArgs): Promise<string> => {
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

export const runRule = async ({ getService, roleAuthc, ruleId }: RunRuleArgs): Promise<unknown> => {
  const alertingApi = getService('alertingApi');
  return alertingApi.runRule(roleAuthc, ruleId);
};

export const deleteRules = async ({ getService, roleAuthc }: DeleteRulesArgs): Promise<unknown> => {
  const alertingApi = getService('alertingApi');
  return alertingApi.deleteRules({ roleAuthc });
};
