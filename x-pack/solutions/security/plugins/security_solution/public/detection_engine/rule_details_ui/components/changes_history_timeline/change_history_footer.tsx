/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

interface TrackingStartedFooterProps {
  startedAt: Date;
}

export const TrackingStartedFooter = memo(function TrackingStartedFooter({
  startedAt,
}: TrackingStartedFooterProps): JSX.Element {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-top: ${euiTheme.border.thin};
      `}
      data-test-subj="ruleChangeHistoryTrackingStarted"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <i18n.TRACKING_STARTED_ON date={startedAt} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
