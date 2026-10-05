/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

// Single-line rows keep every slide the same height, so switching slides never shifts the layout.
const truncateCss = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Assignees, open in chat, and more actions.
const ROW_ACTION_ICONS = ['plusCircle', 'productAgent', 'boxesVertical'] as const;

interface Props {
  age: string;
  reopened?: boolean;
  title: string;
  description: string;
}

/** A single decorative queue row in the UI preview, preceded by a divider. */
export const OnboardingPreviewRow: React.FC<Props> = ({ age, reopened, title, description }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup
        gutterSize="m"
        alignItems="flexStart"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem
          css={css`
            min-inline-size: 0;
          `}
        >
          <EuiText size="xs" color="subdued">
            {reopened ? `${age} · ${i18n.PREVIEW_REOPENED}` : age}
          </EuiText>
          <EuiText size="s" css={truncateCss}>
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="s" css={truncateCss}>
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
            {ROW_ACTION_ICONS.map((iconType) => (
              <EuiFlexItem grow={false} key={iconType}>
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    block-size: ${euiTheme.size.xl};
                    inline-size: ${euiTheme.size.xl};
                  `}
                >
                  <EuiIcon type={iconType} aria-hidden={true} />
                </div>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
