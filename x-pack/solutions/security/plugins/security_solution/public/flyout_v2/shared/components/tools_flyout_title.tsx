/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiButtonEmpty, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { TOOLS_FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

export interface ToolsFlyoutTitleProps {
  /**
   * Callback invoked when the title is clicked.
   */
  onTitleClick: () => void;
  /**
   * Text label displayed in the title.
   */
  label: string;
  /**
   * EUI icon type rendered next to the label.
   */
  iconType: IconType;
}

/**
 * Clickable title used in tools flyout headers. Renders an expand icon followed by a
 * context icon and label. Clicking opens the originating document or entity flyout.
 */
export const ToolsFlyoutTitle: FC<ToolsFlyoutTitleProps> = memo(
  ({ onTitleClick, label, iconType }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiToolTip content={label}>
        <EuiButtonEmpty
          onClick={onTitleClick}
          iconType="maximize"
          size="xs"
          flush="left"
          css={{ maxWidth: '100%', minWidth: 0 }}
          data-test-subj={TOOLS_FLYOUT_HEADER_TITLE_TEST_ID}
        >
          <span css={{ alignItems: 'center', display: 'flex', maxWidth: '100%', minWidth: 0 }}>
            <EuiIcon
              type={iconType}
              size="m"
              aria-hidden={true}
              css={{ flexShrink: 0, marginRight: euiTheme.size.xs }}
            />
            <span
              css={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </span>
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }
);

ToolsFlyoutTitle.displayName = 'ToolsFlyoutTitle';
