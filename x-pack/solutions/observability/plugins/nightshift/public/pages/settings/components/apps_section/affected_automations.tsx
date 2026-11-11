/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useFetchAutomations } from '../../../../data/automations/use_automations';
import { useAllRelayAppBindings } from '../../../../data/relay_apps/use_relay_app_bindings';

const MAX_LISTED_AUTOMATIONS = 5;

interface AutomationLike {
  name: string;
  isEnabled: boolean;
  trigger: { rows: Array<{ kind: string; channels?: string[] }> };
}

export interface AffectedAutomations {
  count: number;
  names: string[];
}

interface ChannelRef {
  id: string;
  displayName?: string;
}

/**
 * Automations that stop triggering once `removed` channels are gone: every channel of their Slack
 * trigger is removed and none is in `remaining`. `#name` is matched too, since older automations
 * store the channel name instead of its id. A trigger with no channel filter fires in every
 * connected channel, so it only counts with `includeUnscoped` (a workspace disconnect).
 */
export const findAffectedAutomations = (
  automations: AutomationLike[],
  removed: ChannelRef[],
  {
    remaining = [],
    includeUnscoped = false,
  }: { remaining?: ChannelRef[]; includeUnscoped?: boolean } = {}
): AffectedAutomations => {
  const accept = (channels: ChannelRef[]) =>
    new Set(
      channels.flatMap(({ id, displayName }) => (displayName ? [id, `#${displayName}`] : [id]))
    );
  const gone = accept(removed);
  const kept = accept(remaining);
  const affected = automations.filter(({ trigger }) =>
    trigger.rows.some(({ kind, channels: triggerChannels = [] }) => {
      if (kind !== 'slack' || gone.size === 0) return false;
      if (triggerChannels.length === 0) return includeUnscoped;
      return (
        triggerChannels.some((value) => gone.has(value)) &&
        !triggerChannels.some((value) => kept.has(value))
      );
    })
  );
  return {
    count: affected.length,
    names: affected.slice(0, MAX_LISTED_AUTOMATIONS).map(({ name, isEnabled }) =>
      isEnabled
        ? name
        : i18n.translate('xpack.nightshift.settings.apps.affectedAutomationDisabled', {
            defaultMessage: '{name} (disabled)',
            values: { name },
          })
    ),
  };
};

const AutomationsWarning = ({
  removed,
  remaining,
  includeUnscoped,
}: {
  removed: ChannelRef[];
  remaining?: ChannelRef[];
  includeUnscoped?: boolean;
}) => {
  const { data } = useFetchAutomations();
  if (!data) return null;

  const { count, names } = findAffectedAutomations(data.automations, removed, {
    remaining,
    includeUnscoped,
  });
  if (count === 0) return null;

  return (
    <>
      <EuiSpacer size="m" />
      <KbnWarningCallout
        size="s"
        title={i18n.translate('xpack.nightshift.settings.apps.affectedAutomationsTitle', {
          defaultMessage:
            '{count, plural, one {# automation} other {# automations}} will stop triggering from Slack',
          values: { count },
        })}
        data-test-subj="streamsSlackAppAffectedAutomations"
      >
        {names.join(', ')}
        {count > names.length &&
          i18n.translate('xpack.nightshift.settings.apps.affectedAutomationsMore', {
            defaultMessage: ' and {remaining} more',
            values: { remaining: count - names.length },
          })}
      </KbnWarningCallout>
    </>
  );
};

const toChannelRefs = (bindings: SlackChannelBinding[]): ChannelRef[] =>
  bindings.flatMap(({ channel, displayName }) =>
    channel != null ? [{ id: channel, displayName }] : []
  );

/**
 * Warns which automations stop triggering once a channel is disconnected. Renders nothing while
 * loading, on error, or when none are affected, so it never blocks the disconnect.
 */
export const ChannelAffectedAutomationsWarning = ({ channel }: { channel: ChannelRef }) => {
  const { bindings, isError, isComplete } = useAllRelayAppBindings();
  // Without the full connected list, an automation on several channels can't be ruled out.
  const remaining =
    isError || !isComplete
      ? undefined
      : toChannelRefs(bindings).filter(({ id }) => id !== channel.id);
  return <AutomationsWarning removed={[channel]} remaining={remaining} />;
};

/** Same warning for a workspace disconnect, which drops every currently connected channel. */
export const WorkspaceAffectedAutomationsWarning = () => {
  const { bindings } = useAllRelayAppBindings();
  return <AutomationsWarning removed={toChannelRefs(bindings)} includeUnscoped />;
};
