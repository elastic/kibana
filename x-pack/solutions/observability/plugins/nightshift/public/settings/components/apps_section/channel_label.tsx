/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const privateChannelLabels = {
  name: i18n.translate('xpack.nightshift.settings.apps.privateChannelIconLabel', {
    defaultMessage: 'Private channel',
  }),
  tooltip: i18n.translate('xpack.nightshift.settings.apps.privateChannelTooltip', {
    defaultMessage: 'Private channel. Slack doesn’t share its name.',
  }),
};

/** Lock icon with a text alternative for screen readers; the tooltip explains the missing name. */
export const PrivateChannelIcon = (): React.ReactElement => (
  <EuiIconTip
    type="lock"
    size="s"
    content={privateChannelLabels.tooltip}
    aria-label={privateChannelLabels.name}
    iconProps={{ 'data-test-subj': 'slackPrivateChannelIcon' }}
  />
);

export const ChannelLabel = ({
  label,
  channelId,
  isPrivate,
}: {
  label: string;
  channelId?: string;
  isPrivate: boolean;
}): React.ReactElement =>
  isPrivate ? (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} component="span">
      <EuiFlexItem grow={false}>
        <PrivateChannelIcon />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{channelId}</EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <>{label}</>
  );
