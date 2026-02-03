/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface Props {
  title: string;
  renderTooltip?: boolean;
  tooltipContent?: React.ReactNode;
  append?: React.ReactNode;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

export function SloFlyoutPanel({
  title,
  renderTooltip,
  tooltipContent,
  append,
  children,
  'data-test-subj': dataTestSubj,
}: Props) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} data-test-subj={dataTestSubj}>
      <EuiSplitPanel.Inner
        color="subdued"
        paddingSize="s"
        css={css`
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" css={{ fontWeight: 500 }}>
                {title}
              </EuiText>
            </EuiFlexItem>
            {renderTooltip && (
              <EuiFlexItem grow={false}>
                <EuiIconTip content={tooltipContent} size="s" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {append && <EuiFlexItem grow={false}>{append}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="transparent">{children}</EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
