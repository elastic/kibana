/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { PrivateChannelIcon } from '../../../settings/components/apps_section/channel_label';
import { parseSlackChannelInput } from '../../../settings/components/apps_section/parse_slack_channel_input';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useKibana } from '../../../hooks/use_kibana';
import {
  formatChannelLabel,
  formatChannelValue,
  useAllRelayAppBindings,
  type UseAllRelayAppBindings,
} from '../../../settings/components/apps_section/use_relay_app_bindings';

/** Selected values that are not connected channels; none unless the full connected list loaded. */
export const findUnconnectedChannels = (
  values: string[],
  { bindings, isLoading, isError, isComplete }: UseAllRelayAppBindings
): string[] =>
  isLoading || isError || !isComplete || bindings.length === 0
    ? []
    : values.filter((value) => !bindings.some(({ channel }) => channel === value));

// Private channels are never suggested; a user can still enter one by ID or link.
const isSuggestedChannel = ({ visibility }: SlackChannelBinding): boolean =>
  visibility !== 'private';

const labels = {
  customOption: i18n.translate('xpack.nightshift.automations.flyout.slackChannelsCustomOption', {
    defaultMessage: 'Add {searchValue} by channel ID or link',
    values: { searchValue: '{searchValue}' },
  }),
  loadError: i18n.translate('xpack.nightshift.automations.flyout.slackChannelsLoadError', {
    defaultMessage: 'Unable to load connected Slack channels.',
  }),
  notConnected: (channels: string) =>
    i18n.translate('xpack.nightshift.automations.flyout.slackChannelsNotConnected', {
      defaultMessage: 'Not connected: {channels}. Messages there will not start this automation.',
      values: { channels },
    }),
  truncated: (count: number) =>
    i18n.translate('xpack.nightshift.automations.flyout.slackChannelsTruncated', {
      defaultMessage: 'Showing the first {count} connected channels.',
      values: { count },
    }),
};

const ConnectChannelsLink = ({ testSubject }: { testSubject: string }) => {
  const { application } = useKibana().services;
  return (
    <EuiLink
      href={application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/settings/general' })}
      data-test-subj={`${testSubject}ConnectLink`}
      {...getEbtProps({
        action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
        element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_FORM,
      })}
    >
      <FormattedMessage
        id="xpack.nightshift.automations.flyout.slackChannelsConnectLink"
        defaultMessage="Connect channels in Settings"
      />
    </EuiLink>
  );
};

/**
 * Picks Slack channels connected to this deployment. Values are channel ids; a stored value that
 * is not a connected id (a legacy name, a since-unbound channel) stays selected as is.
 */
export const SlackChannelComboBox = ({
  values,
  onChange,
  ariaLabel,
  placeholder,
  testSubject,
  singleSelection = false,
  warnUnconnected = false,
  autoFocus = false,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  ariaLabel: string;
  placeholder: string;
  testSubject: string;
  singleSelection?: boolean;
  /** Flags selected values that are not connected channels, for matching that needs a channel id. */
  warnUnconnected?: boolean;
  autoFocus?: boolean;
}) => {
  const connected = useAllRelayAppBindings();
  const { bindings, isLoading, isError, isComplete } = connected;

  const options: Array<EuiComboBoxOptionOption<string>> = bindings
    .filter(isSuggestedChannel)
    .map((binding) => ({
      label: formatChannelLabel(binding),
      value: binding.channel,
    }));
  const privateIds = new Set(
    bindings.flatMap(({ channel, visibility }) =>
      channel != null && visibility === 'private' ? [channel] : []
    )
  );
  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = values.map((value) =>
    privateIds.has(value)
      ? { label: value, value, prepend: <PrivateChannelIcon /> }
      : { label: formatChannelValue(value, bindings), value }
  );
  const onCreateOption = (input: string): boolean => {
    const channel = parseSlackChannelInput(input);
    if (channel === undefined) return false;
    onChange(
      singleSelection ? [channel] : [...values.filter((value) => value !== channel), channel]
    );
    return true;
  };
  const isEmpty = !isLoading && !isError && bindings.length === 0;
  const unconnected = warnUnconnected ? findUnconnectedChannels(values, connected) : [];
  const isTruncated = !isLoading && !isError && !isComplete;

  return (
    <>
      <EuiComboBox<string>
        compressed
        fullWidth
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        isLoading={isLoading}
        isInvalid={unconnected.length > 0}
        options={options}
        selectedOptions={selectedOptions}
        singleSelection={singleSelection ? { asPlainText: true } : false}
        onChange={(selected) => onChange(selected.map(({ label, value }) => value ?? label))}
        onCreateOption={onCreateOption}
        customOptionText={labels.customOption}
        data-test-subj={testSubject}
      />
      {(isError || isEmpty || isTruncated || unconnected.length > 0) && (
        <>
          <EuiSpacer size="xs" />
          <EuiText
            size="xs"
            color={unconnected.length > 0 ? 'danger' : 'subdued'}
            data-test-subj={`${testSubject}Help`}
          >
            {isError && labels.loadError}
            {isTruncated && labels.truncated(bindings.length)}
            {isEmpty && (
              <FormattedMessage
                id="xpack.nightshift.automations.flyout.slackChannelsEmpty"
                defaultMessage="No Slack channels are connected. {connectLink}"
                values={{ connectLink: <ConnectChannelsLink testSubject={testSubject} /> }}
              />
            )}
            {unconnected.length > 0 &&
              labels.notConnected(
                unconnected.map((value) => formatChannelValue(value, bindings)).join(', ')
              )}
          </EuiText>
        </>
      )}
    </>
  );
};
