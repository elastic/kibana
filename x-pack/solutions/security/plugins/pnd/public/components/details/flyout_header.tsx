/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlyoutHeader,
  EuiButtonIcon,
  EuiToolTip,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { DETAILS_FLYOUT_LABELS } from './translations';
export const ConversationDetailsFlyoutHeader: React.FC<{ onClose: () => void }> = memo(
  ({ onClose }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlyoutHeader hasBorder css={{ paddingBlock: `${euiTheme.size.m} !important` }}>
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={DETAILS_FLYOUT_LABELS.header.flyoutMenu.share}
              disableScreenReaderOutput
              display="inlineBlock"
            >
              <EuiButtonIcon
                aria-label={DETAILS_FLYOUT_LABELS.header.flyoutMenu.share}
                iconType="share"
                color="text"
                onClick={() => {
                  // TODO: Implement if needed
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <div
            style={{
              display: ' inline-block',
              width: '1px',
              height: euiTheme.size.base,
              background: euiTheme.colors.lightShade,
            }}
          />
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={DETAILS_FLYOUT_LABELS.header.flyoutMenu.close}
              disableScreenReaderOutput
              display="inlineBlock"
            >
              <EuiButtonIcon
                aria-label={DETAILS_FLYOUT_LABELS.header.flyoutMenu.close}
                iconType="cross"
                color="text"
                onClick={onClose}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    );
  }
);

ConversationDetailsFlyoutHeader.displayName = 'ConversationDetailsFlyoutHeader';
