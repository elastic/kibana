/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UseAllRelayAppBindings } from '../../../data/relay_apps/use_relay_app_bindings';

interface TriggerRowLike {
  kind: string;
  channels?: string[];
}

/**
 * Selected values that are not connected channels; none unless the full connected list loaded.
 * A legacy `#name` value counts as connected when it matches a connected channel's name.
 */
export const findUnconnectedChannels = (
  values: string[],
  { bindings, isLoading, isError, isComplete }: UseAllRelayAppBindings
): string[] =>
  isLoading || isError || !isComplete
    ? []
    : values.filter(
        (value) =>
          !bindings.some(
            ({ channel, displayName }) =>
              channel === value || (displayName != null && `#${displayName}` === value)
          )
      );

/** Channels named by the Slack triggers of an automation that are not connected anymore. */
export const getUnconnectedSlackChannels = (
  rows: TriggerRowLike[],
  connected: UseAllRelayAppBindings
): string[] => {
  const channels = rows.flatMap((row) => (row.kind === 'slack' ? row.channels ?? [] : []));
  return [...new Set(findUnconnectedChannels(channels, connected))];
};

export const getUnconnectedSlackChannelsMessage = (channels: string[]): string =>
  i18n.translate('xpack.nightshift.automations.unconnectedSlackChannels', {
    defaultMessage:
      'Slack channel not connected: {channels}. Messages there will not start this automation.',
    values: { channels: channels.join(', ') },
  });
