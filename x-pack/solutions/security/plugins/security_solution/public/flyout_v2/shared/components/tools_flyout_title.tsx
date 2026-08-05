/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiButtonEmpty, EuiIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { TOOLS_FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

export interface ToolsFlyoutTitleProps {
  /**
   * Callback invoked when the title is clicked. When omitted the title renders as plain text
   * (no expand icon, no button) — used in rule preview contexts where the source document
   * cannot be re-opened.
   */
  onTitleClick?: () => void;
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
 * Title used in tools flyout headers. When `onTitleClick` is provided, renders a clickable
 * button with an expand icon that opens the originating document or entity flyout. When
 * omitted (rule preview), renders as plain text so the label and badge remain visible without
 * creating a broken link to a transient document.
 */
export const ToolsFlyoutTitle: FC<ToolsFlyoutTitleProps> = memo(
  ({ onTitleClick, label, iconType }) => {
    const { euiTheme } = useEuiTheme();

    const inner = (
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
    );

    return (
      <EuiToolTip content={label}>
        {onTitleClick ? (
          <EuiButtonEmpty
            onClick={onTitleClick}
            iconType="expand"
            size="xs"
            flush="left"
            css={{ maxWidth: '100%', minWidth: 0 }}
            data-test-subj={TOOLS_FLYOUT_HEADER_TITLE_TEST_ID}
          >
            {inner}
          </EuiButtonEmpty>
        ) : (
          <EuiText
            size="xs"
            css={{ maxWidth: '100%', minWidth: 0 }}
            data-test-subj={TOOLS_FLYOUT_HEADER_TITLE_TEST_ID}
          >
            {inner}
          </EuiText>
        )}
      </EuiToolTip>
    );
  }
);

ToolsFlyoutTitle.displayName = 'ToolsFlyoutTitle';
