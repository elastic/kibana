/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import { tlsRuleParamsSchema } from '@kbn/response-ops-rule-params/synthetics_tls';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { TLSRuleExecutor } from '../../alert_rules/tls_rule/tls_rule_executor';
import { WRITE_SYNTHETICS_DEFAULT_RULES_API } from '../../feature';

export const syntheticsInspectTLSRuleRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.INSPECT_TLS_RULE,
  validate: {
    body: tlsRuleParamsSchema,
  },
  // Inspecting rule params is a read-only preview, not a monitor mutation.
  writeAccess: false,
  anyRequiredPrivileges: ['uptime-write', WRITE_SYNTHETICS_DEFAULT_RULES_API],
  handler: async ({
    request,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
    context,
    spaceId,
  }) => {
    const { elasticsearch, uiSettings } = await context.core;

    const tlsRule = new TLSRuleExecutor(
      new Date(),
      request.body as TLSRuleParams,
      savedObjectsClient,
      elasticsearch.client.asCurrentUser,
      server,
      syntheticsMonitorClient,
      spaceId,
      'Inspect TLS Rule',
      uiSettings.client
    );

    return tlsRule.getRuleThresholdOverview();
  },
});
