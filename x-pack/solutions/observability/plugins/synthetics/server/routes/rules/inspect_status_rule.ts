/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SyntheticsMonitorStatusRuleParams,
  syntheticsMonitorStatusRuleParamsSchema,
} from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { StatusRuleExecutorOptions } from '../../alert_rules/status_rule/types';
import { StatusRuleExecutor } from '../../alert_rules/status_rule/status_rule_executor';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const syntheticsInspectStatusRuleRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.INSPECT_STATUS_RULE,
  validate: {
    body: syntheticsMonitorStatusRuleParamsSchema,
  },
  handler: async ({
    request,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
    spaceId,
    context,
    syntheticsEsClient,
  }): Promise<any> => {
    const { uiSettings, elasticsearch } = await context.core;

    const { client: esClient } = elasticsearch;

    const ruleParams = request.body as SyntheticsMonitorStatusRuleParams;
    const services = {
      scopedClusterClient: esClient,
      savedObjectsClient,
      uiSettingsClient: uiSettings.client,
    } as unknown as StatusRuleExecutorOptions['services'];

    const statusRule = new StatusRuleExecutor(syntheticsEsClient, server, syntheticsMonitorClient, {
      spaceId,
      services,
      params: ruleParams,
      state: {} as any,
      previousStartedAt: new Date(),
      rule: { name: 'Inspect Status Rule', id: 'inspect-status-rule' } as any,
      logger: server.logger,
      executionId: 'inspect-status-rule',
      startedAt: new Date(),
      isServerless: false,
      startedAtOverridden: false,
      flappingSettings: {} as any,
      getTimeRange: {} as any,
    } as StatusRuleExecutorOptions);

    return await statusRule.getRuleThresholdOverview();
  },
});
