/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { catchAxiosErrorFormatAndThrow } from '@kbn/securitysolution-utils';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { createConnector } from '../../../endpoint/common/connectors_services';
import type { Client as DetectionsClient } from '../../../../common/api/quickstart_client.gen';
import { basicRule } from '../rules/new_terms/basic_rule';

interface LegacyActionRequestSchema {
  query: {
    alert_id: string;
  };
  body: {
    name: string;
    interval: string;
    actions: Array<{
      id: string;
      group: string;
      params: {
        message: string;
      };
      actionTypeId: string;
    }>;
  };
}

interface LegacyActionResponse {
  body: {
    ok: 'acknowledged';
  };
}
/**
 * Utility to easily create a "legacy" action for security rules. Legacy actions were the original way to
 * make a throttled action that fires on a different interval than the rule, e.g. a rule that runs every 5m
 * might send actions only once per hour. This was accomplished by creating a separate rule under the hood
 * to retrieve alerts on the throttle interval and run the actions.
 */
export const createOrUpdateLegacyAction = async (
  props: LegacyActionRequestSchema,
  log: ToolingLog,
  kbnClient: KbnClient
) => {
  log.info(`${new Date().toISOString()} Calling API CreateOrUpdateLegacyAction`);
  return kbnClient
    .request<LegacyActionResponse>({
      path: '/internal/api/detection/legacy/notifications',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
      },
      method: 'POST',
      body: props.body,
      query: props.query,
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Create a connector, create a rule, then create a legacy action for the rule.
 */
export const createRuleWithLegacyAction = async ({
  log,
  kbnClient,
  detectionsClient,
}: {
  log: ToolingLog;
  kbnClient: KbnClient;
  detectionsClient: DetectionsClient;
}): Promise<void> => {
  const connector = await createConnector(kbnClient, {
    name: 'my slack connector',
    connector_type_id: '.slack',
    config: {},
    secrets: {
      webhookUrl: 'http://localhost:1234',
    },
  });
  const createdRule = await detectionsClient.createRule({ body: basicRule });
  await createOrUpdateLegacyAction(
    {
      query: { alert_id: createdRule.data.id },
      body: {
        name: 'my_action',
        interval: '1h',
        actions: [
          {
            id: connector.id,
            group: 'default',
            params: { message: 'test message' },
            actionTypeId: '.slack',
          },
        ],
      },
    },
    log,
    kbnClient
  );
};
