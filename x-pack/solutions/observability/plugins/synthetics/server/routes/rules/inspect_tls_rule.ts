/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TLSRuleParams, tlsRuleParamsSchema } from '@kbn/response-ops-rule-params/synthetics_tls';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { TLSRuleExecutor } from '../../alert_rules/tls_rule/tls_rule_executor';

export const syntheticsInspectTLSRuleRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.INSPECT_TLS_RULE,
  validate: {
    body: tlsRuleParamsSchema,
  },
  handler: async ({
    request,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
    context,
    spaceId,
  }) => {
    const { elasticsearch } = await context.core;

    const tlsRule = new TLSRuleExecutor(
      new Date(),
      request.body as TLSRuleParams,
      savedObjectsClient,
      elasticsearch.client.asCurrentUser,
      server,
      syntheticsMonitorClient,
      spaceId,
      'Inspect TLS Rule'
    );

    return tlsRule.getRuleThresholdOverview();
  },
});
