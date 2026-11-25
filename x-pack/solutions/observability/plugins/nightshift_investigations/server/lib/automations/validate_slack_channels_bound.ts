/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { isSlackChannelId } from '../../../common';
import type { SlackChannelBindingChecker } from '../../types';
import { isElasticAppSlackChannelCompletion } from './slack_completion';
import type { NightshiftAutomationAttributes } from './types';

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
  for (const completion of automation.completions) {
    const channel = completion.destination?.trim();
    if (!isElasticAppSlackChannelCompletion(completion) || !channel) {
      continue;
    }
    if (isSlackChannelId(channel)) {
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
