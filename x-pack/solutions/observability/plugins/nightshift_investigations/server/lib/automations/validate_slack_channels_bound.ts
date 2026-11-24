/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SlackChannelBindingChecker } from '../../types';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from './generate_workflow_yaml';
import type { NightshiftAutomationAttributes } from './types';

export const validateSlackChannelsBound = async ({
  automation,
  request,
  checker,
}: {
  automation: Pick<NightshiftAutomationAttributes, 'completions'>;
  request: KibanaRequest;
  checker: SlackChannelBindingChecker | undefined;
}): Promise<void> => {
  if (!checker) return;
  const channels = new Set<string>();
  for (const { action, targetMode, destination, connectorId } of automation.completions) {
    const isElasticApp =
      (connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID) === ELASTIC_APPS_SLACK_CONNECTOR_ID;
    if (action === 'post_to_slack' && targetMode === 'channel' && destination && isElasticApp) {
      channels.add(destination.trim());
    }
  }
  for (const channel of channels) {
    if ((await checker(request, channel)) === false) {
      throw badRequest(`Slack channel ${channel} is not connected to Nightshift.`);
    }
  }
};
