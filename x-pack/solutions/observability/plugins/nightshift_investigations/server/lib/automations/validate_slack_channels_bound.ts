/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import type { SlackChannelBindingChecker } from '../../types';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from './generate_workflow_yaml';
import type { NightshiftAutomationAttributes } from './types';

const SLACK_CHANNEL_ID_PATTERN = /^[CG][A-Z0-9]+$/;

export const validateSlackChannelsBound = async ({
  automation,
  request,
  checker,
  logger,
  storedDestinations = new Set<string>(),
}: {
  automation: Pick<NightshiftAutomationAttributes, 'completions'>;
  request: KibanaRequest;
  checker: SlackChannelBindingChecker | undefined;
  logger: Logger;
  storedDestinations?: ReadonlySet<string>;
}): Promise<void> => {
  const channels = new Set<string>();
  for (const { action, targetMode, destination, connectorId } of automation.completions) {
    const isElasticApp =
      (connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID) === ELASTIC_APPS_SLACK_CONNECTOR_ID;
    const channel = destination?.trim();
    if (action !== 'post_to_slack' || targetMode !== 'channel' || !isElasticApp || !channel) {
      continue;
    }
    if (SLACK_CHANNEL_ID_PATTERN.test(channel)) {
      channels.add(channel);
    } else if (!storedDestinations.has(channel)) {
      throw badRequest('Slack destinations must be a channel ID, not a channel name.');
    }
  }
  if (channels.size === 0) return;
  if (!checker) {
    throw badRequest('The Elastic Slack App is not available on this deployment.');
  }
  for (const channel of channels) {
    const isBound = await checker(request, channel).catch((error: Error) => {
      logger.warn(`Could not check the binding of Slack channel ${channel}: ${error.message}`);
      throw serverUnavailable(`Could not check that Slack channel ${channel} is connected.`);
    });
    if (!isBound) {
      throw badRequest(`Slack channel ${channel} is not connected to Nightshift.`);
    }
  }
};
