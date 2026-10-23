/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import type { SlackChannelEligibilityCallback } from '../../types';
import type { NightshiftAutomationAttributes } from './types';

const collectAutomationSlackChannels = ({
  trigger,
  completions,
}: Pick<NightshiftAutomationAttributes, 'trigger' | 'completions'>): string[] => {
  const channels = new Set<string>();
  for (const row of trigger.rows) {
    if (row.kind !== 'slack') continue;
    for (const channel of row.channels ?? []) channels.add(channel.trim());
  }
  for (const { action, targetMode, destination } of completions) {
    if (action === 'post_to_slack' && targetMode === 'channel' && destination) {
      channels.add(destination.trim());
    }
  }
  channels.delete('');
  return [...channels];
};

/** Rejects private Slack channels, which automations don't support yet; fails closed when the check can't run. */
export const assertSlackChannelsEligible = async ({
  automation,
  checkEligibility,
}: {
  automation: Pick<NightshiftAutomationAttributes, 'trigger' | 'completions'>;
  checkEligibility?: SlackChannelEligibilityCallback;
}): Promise<void> => {
  const channels = collectAutomationSlackChannels(automation);
  if (!checkEligibility || channels.length === 0) return;

  let ineligible: string[];
  try {
    ineligible = await checkEligibility(channels);
  } catch {
    throw serverUnavailable('Could not check Slack channels. Try again in a moment.');
  }
  if (ineligible.length > 0) {
    throw badRequest(
      `Private Slack channels aren't available for automations yet. Remove ${ineligible.join(
        ', '
      )} and save again.`
    );
  }
};
