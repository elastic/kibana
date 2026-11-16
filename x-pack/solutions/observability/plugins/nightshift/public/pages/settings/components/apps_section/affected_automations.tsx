/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
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
 * Automations whose Slack triggers can fire before `removed` channels are disconnected but not
 * after, when only `remaining` channels stay connected. A trigger row fires in a connected channel
 * it names, or in any connected channel when it has no channel filter. `#name` is matched too,
 * since older automations store the channel name instead of its id.
 */
export const findAffectedAutomations = (
  automations: AutomationLike[],
  removed: ChannelRef[],
  remaining: ChannelRef[]
): AffectedAutomations => {
  const accept = (channels: ChannelRef[]) =>
    new Set(
      channels.flatMap(({ id, displayName }) => (displayName ? [id, `#${displayName}`] : [id]))
    );
  const before = accept([...removed, ...remaining]);
  const after = accept(remaining);
  const fires = (rows: AutomationLike['trigger']['rows'], connected: Set<string>) =>
    rows.some(({ channels = [] }) =>
      channels.length === 0 ? connected.size > 0 : channels.some((value) => connected.has(value))
    );
  const affected = automations.filter(({ trigger }) => {
    const slackRows = trigger.rows.filter(({ kind }) => kind === 'slack');
    return fires(slackRows, before) && !fires(slackRows, after);
  });
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

const CheckingAutomations = () => (
  <>
    <EuiSpacer size="m" />
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="streamsSlackAppAffectedAutomationsLoading"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.nightshift.settings.apps.affectedAutomationsChecking', {
            defaultMessage: 'Checking which automations use Slack triggers',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

const AutomationsWarning = ({
  removed,
  remaining,
}: {
  removed: ChannelRef[];
  remaining: ChannelRef[];
}) => {
  const { data, isLoading } = useFetchAutomations();
  if (isLoading) return <CheckingAutomations />;
  if (!data) return null;

  const { count, names } = findAffectedAutomations(data.automations, removed, remaining);
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

const BindingsAwareWarning = ({
  toChange,
}: {
  toChange: (connected: ChannelRef[]) => { removed: ChannelRef[]; remaining: ChannelRef[] };
}) => {
  const { bindings, isLoading, isError, isComplete } = useAllRelayAppBindings();
  if (isLoading) return <CheckingAutomations />;
  // Which automations lose every trigger depends on the channels that stay connected, so a failed
  // or cut-short list gives no warning rather than a wrong one.
  if (isError || !isComplete) return null;
  return <AutomationsWarning {...toChange(toChannelRefs(bindings))} />;
};

/**
 * Warns which automations stop triggering once a channel is disconnected. Shows a loading line
 * while it checks, and nothing on error or when none are affected, so it never blocks the
 * disconnect.
 */
export const ChannelAffectedAutomationsWarning = ({ channel }: { channel: ChannelRef }) => (
  <BindingsAwareWarning
    toChange={(connected) => ({
      removed: [channel],
      remaining: connected.filter(({ id }) => id !== channel.id),
    })}
  />
);

/** Same warning for a workspace disconnect, which drops every currently connected channel. */
export const WorkspaceAffectedAutomationsWarning = () => (
  <BindingsAwareWarning toChange={(connected) => ({ removed: connected, remaining: [] })} />
);
